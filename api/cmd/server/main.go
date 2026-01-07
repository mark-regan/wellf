package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/mark-regan/wellf/internal/config"
	"github.com/mark-regan/wellf/internal/database"
	"github.com/mark-regan/wellf/internal/handlers"
	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/repository"
	"github.com/mark-regan/wellf/internal/services"
	"github.com/mark-regan/wellf/internal/yahoo"
	"github.com/mark-regan/wellf/pkg/jwt"
	"github.com/mark-regan/wellf/pkg/validator"
)

func main() {
	// Setup logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// Connect to database
	db, err := database.New(cfg.Database.URL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	// Run migrations
	logger.Info("running database migrations...")
	if err := db.Migrate("./migrations"); err != nil {
		logger.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}
	logger.Info("migrations completed successfully")

	// Connect to Redis
	redis, err := database.NewRedis(cfg.Redis.URL)
	if err != nil {
		logger.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	defer redis.Close()

	// Initialize JWT manager
	jwtManager := jwt.NewManager(cfg.JWT.Secret, cfg.JWT.ExpiresIn, cfg.JWT.RefreshExpiresIn)

	// Initialize validator
	v := validator.New()

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	portfolioRepo := repository.NewPortfolioRepository(db.Pool)
	assetRepo := repository.NewAssetRepository(db.Pool)
	holdingRepo := repository.NewHoldingRepository(db.Pool)
	txRepo := repository.NewTransactionRepository(db.Pool)
	cashRepo := repository.NewCashAccountRepository(db.Pool)
	fixedAssetRepo := repository.NewFixedAssetRepository(db.Pool)

	// Initialize Yahoo client and service
	yahooClient := yahoo.NewClient()
	yahooService := services.NewYahooService(yahooClient, assetRepo, redis, cfg.Yahoo.CacheTTL, logger)

	// Initialize services
	authService := services.NewAuthService(userRepo, portfolioRepo, jwtManager, v)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	portfolioHandler := handlers.NewPortfolioHandler(portfolioRepo, holdingRepo, txRepo)
	holdingHandler := handlers.NewHoldingHandler(holdingRepo, portfolioRepo, yahooService)
	txHandler := handlers.NewTransactionHandler(txRepo, holdingRepo, portfolioRepo, yahooService)
	assetHandler := handlers.NewAssetHandler(assetRepo, yahooService)
	cashHandler := handlers.NewCashAccountHandler(cashRepo, portfolioRepo)
	fixedAssetHandler := handlers.NewFixedAssetHandler(fixedAssetRepo)
	dashboardHandler := handlers.NewDashboardHandler(portfolioRepo, holdingRepo, txRepo, cashRepo, fixedAssetRepo, userRepo, yahooService)
	healthHandler := handlers.NewHealthHandler(db, redis)
	adminHandler := handlers.NewAdminHandler(userRepo)

	// Setup router
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimiddleware.RequestID)
	r.Use(middleware.Logger(logger))
	r.Use(middleware.Recoverer(logger))
	r.Use(middleware.JSON)
	// CORS origins - defaults plus any from CORS_ORIGINS env var
	corsOrigins := []string{"http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "https://wellf.mkrn.io", "http://wellf.mkrn.io"}
	if origins := os.Getenv("CORS_ORIGINS"); origins != "" {
		for _, origin := range strings.Split(origins, ",") {
			corsOrigins = append(corsOrigins, strings.TrimSpace(origin))
		}
	}
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   corsOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// API routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public routes
		r.Get("/health", healthHandler.Health)
		r.Get("/health/ready", healthHandler.Ready)
		r.Get("/config/currencies", healthHandler.Currencies)
		r.Get("/config/asset-types", healthHandler.AssetTypes)
		r.Get("/config/portfolio-types", healthHandler.PortfolioTypes)
		r.Get("/config/transaction-types", healthHandler.TransactionTypes)

		// Auth routes (public)
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
		})

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(jwtManager))

			// Auth
			r.Get("/auth/me", authHandler.Me)
			r.Put("/auth/me", authHandler.UpdateMe)
			r.Put("/auth/password", authHandler.ChangePassword)
			r.Post("/auth/logout", authHandler.Logout)

			// Portfolios
			r.Get("/portfolios", portfolioHandler.List)
			r.Post("/portfolios", portfolioHandler.Create)
			r.Get("/portfolios/{id}", portfolioHandler.Get)
			r.Put("/portfolios/{id}", portfolioHandler.Update)
			r.Delete("/portfolios/{id}", portfolioHandler.Delete)
			r.Get("/portfolios/{id}/summary", portfolioHandler.Summary)
			r.Get("/portfolios/{id}/holdings", holdingHandler.ListByPortfolio)
			r.Post("/portfolios/{id}/holdings", holdingHandler.Create)
			r.Get("/portfolios/{id}/transactions", txHandler.List)
			r.Post("/portfolios/{id}/transactions", txHandler.Create)
			r.Post("/portfolios/{id}/transactions/import", txHandler.Import)
			r.Get("/portfolios/{id}/cash-accounts", cashHandler.List)
			r.Post("/portfolios/{id}/cash-accounts", cashHandler.Create)

			// Holdings
			r.Get("/holdings", holdingHandler.ListAll)
			r.Get("/holdings/{holdingId}", holdingHandler.Get)
			r.Put("/holdings/{holdingId}", holdingHandler.Update)
			r.Delete("/holdings/{holdingId}", holdingHandler.Delete)

			// Transactions
			r.Get("/transactions/{txId}", txHandler.Get)
			r.Delete("/transactions/{txId}", txHandler.Delete)

			// Cash Accounts
			r.Get("/cash-accounts", cashHandler.ListAll)
			r.Put("/cash-accounts/{accountId}", cashHandler.Update)
			r.Delete("/cash-accounts/{accountId}", cashHandler.Delete)

			// Assets
			r.Get("/assets/search", assetHandler.Search)
			r.Get("/assets/quotes", assetHandler.GetQuotes)
			r.Get("/assets/{symbol}", assetHandler.GetDetails)
			r.Get("/assets/{symbol}/history", assetHandler.GetHistory)
			r.Post("/assets/refresh", assetHandler.RefreshPrices)
			r.Get("/assets/historical-price", holdingHandler.GetHistoricalPrice)

			// Fixed Assets
			r.Get("/fixed-assets", fixedAssetHandler.List)
			r.Post("/fixed-assets", fixedAssetHandler.Create)
			r.Get("/fixed-assets/{id}", fixedAssetHandler.Get)
			r.Put("/fixed-assets/{id}", fixedAssetHandler.Update)
			r.Delete("/fixed-assets/{id}", fixedAssetHandler.Delete)

			// Dashboard
			r.Get("/dashboard/summary", dashboardHandler.Summary)
			r.Get("/dashboard/allocation", dashboardHandler.Allocation)
			r.Get("/dashboard/top-movers", dashboardHandler.TopMovers)
			r.Get("/dashboard/performance", dashboardHandler.Performance)

			// Admin routes (requires admin privileges)
			r.Route("/admin", func(r chi.Router) {
				r.Use(middleware.AdminOnly(userRepo))
				r.Get("/users", adminHandler.ListUsers)
				r.Delete("/users/{id}", adminHandler.DeleteUser)
				r.Put("/users/{id}/lock", adminHandler.LockUser)
				r.Put("/users/{id}/unlock", adminHandler.UnlockUser)
				r.Put("/users/{id}/admin", adminHandler.SetAdmin)
				r.Post("/users/{id}/reset-password", adminHandler.ResetPassword)
			})
		})
	})

	// Server setup
	server := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		logger.Info("shutting down server...")

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			logger.Error("server shutdown failed", "error", err)
		}
	}()

	// Start server
	logger.Info("starting server", "port", cfg.Server.Port)
	fmt.Printf("Wellf API server running on http://localhost:%s\n", cfg.Server.Port)

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("server error", "error", err)
		os.Exit(1)
	}

	logger.Info("server stopped")
}
