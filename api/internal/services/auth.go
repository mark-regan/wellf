package services

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/mark-regan/wellf/internal/models"
	"github.com/mark-regan/wellf/internal/repository"
	"github.com/mark-regan/wellf/pkg/jwt"
	"github.com/mark-regan/wellf/pkg/validator"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailAlreadyExists = errors.New("email already registered")
	ErrWeakPassword       = errors.New("password does not meet requirements")
	ErrInvalidEmail       = errors.New("invalid email format")
	ErrAccountLocked      = errors.New("account is locked")
)

type AuthService struct {
	userRepo       *repository.UserRepository
	portfolioRepo  *repository.PortfolioRepository
	jwtManager     *jwt.Manager
	validator      *validator.Validator
	tokenBlacklist *TokenBlacklist
}

func NewAuthService(userRepo *repository.UserRepository, portfolioRepo *repository.PortfolioRepository, jwtManager *jwt.Manager, v *validator.Validator, tokenBlacklist *TokenBlacklist) *AuthService {
	return &AuthService{
		userRepo:       userRepo,
		portfolioRepo:  portfolioRepo,
		jwtManager:     jwtManager,
		validator:      v,
		tokenBlacklist: tokenBlacklist,
	}
}

type RegisterRequest struct {
	Email        string `json:"email" validate:"required,email"`
	Password     string `json:"password" validate:"required,min=12"`
	DisplayName  string `json:"display_name"`
	BaseCurrency string `json:"base_currency"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AuthTokens struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

func (s *AuthService) Register(ctx context.Context, req *RegisterRequest) (*models.User, error) {
	if !validator.IsValidEmail(req.Email) {
		return nil, ErrInvalidEmail
	}

	// Check password strength
	if !isStrongPassword(req.Password) {
		return nil, ErrWeakPassword
	}

	// Check if email already exists
	exists, err := s.userRepo.EmailExists(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrEmailAlreadyExists
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, err
	}

	// Set defaults
	if req.BaseCurrency == "" {
		req.BaseCurrency = "GBP"
	}
	if !validator.IsValidCurrency(req.BaseCurrency) {
		req.BaseCurrency = "GBP"
	}

	user := &models.User{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		DisplayName:  req.DisplayName,
		BaseCurrency: req.BaseCurrency,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		if errors.Is(err, repository.ErrUserAlreadyExists) {
			return nil, ErrEmailAlreadyExists
		}
		return nil, err
	}

	// Auto-create Fixed Assets portfolio for the new user
	_ = s.ensureFixedAssetsPortfolio(ctx, user.ID, req.BaseCurrency)

	return user, nil
}

// ensureFixedAssetsPortfolio creates the fixed assets portfolio if it doesn't exist
func (s *AuthService) ensureFixedAssetsPortfolio(ctx context.Context, userID uuid.UUID, currency string) error {
	// Check if fixed assets portfolio already exists
	portfolios, err := s.portfolioRepo.GetByUserID(ctx, userID)
	if err != nil {
		return err
	}

	for _, p := range portfolios {
		if p.Type == models.PortfolioTypeFixedAssets {
			return nil // Already exists
		}
	}

	// Create the fixed assets portfolio
	portfolio := &models.Portfolio{
		UserID:      userID,
		Name:        "Fixed Assets",
		Type:        models.PortfolioTypeFixedAssets,
		Currency:    currency,
		Description: "Non-tradeable assets like property, vehicles, and collectibles",
		IsActive:    true,
	}

	return s.portfolioRepo.Create(ctx, portfolio)
}

// EnsureFixedAssetsPortfolio is the public method to ensure the portfolio exists (for existing users)
func (s *AuthService) EnsureFixedAssetsPortfolio(ctx context.Context, userID uuid.UUID, currency string) error {
	return s.ensureFixedAssetsPortfolio(ctx, userID, currency)
}

func (s *AuthService) Login(ctx context.Context, req *LoginRequest) (*AuthTokens, *models.User, error) {
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, nil, ErrInvalidCredentials
		}
		return nil, nil, err
	}

	// Check if account is locked
	if user.IsLocked {
		return nil, nil, ErrAccountLocked
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	// Update last login
	_ = s.userRepo.UpdateLastLogin(ctx, user.ID)

	// Ensure fixed assets portfolio exists for existing users
	_ = s.ensureFixedAssetsPortfolio(ctx, user.ID, user.BaseCurrency)

	tokens, err := s.generateTokens(user)
	if err != nil {
		return nil, nil, err
	}

	return tokens, user, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*AuthTokens, error) {
	// Use ValidateRefreshToken to ensure this is actually a refresh token, not an access token
	claims, err := s.jwtManager.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, err
	}

	// Check if this refresh token has been blacklisted (token rotation)
	tokenID := claims.ID
	if tokenID != "" && s.tokenBlacklist != nil {
		blacklisted, err := s.tokenBlacklist.IsBlacklisted(ctx, tokenID)
		if err == nil && blacklisted {
			return nil, jwt.ErrInvalidToken
		}
	}

	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, err
	}

	// Check if the user account is locked
	if user.IsLocked {
		return nil, ErrAccountLocked
	}

	// Generate new tokens
	tokens, err := s.generateTokens(user)
	if err != nil {
		return nil, err
	}

	// Blacklist the old refresh token (token rotation - issue 6)
	// Calculate remaining TTL for the old token
	if tokenID != "" && s.tokenBlacklist != nil {
		expiresAt, _ := claims.GetExpirationTime()
		if expiresAt != nil {
			ttl := expiresAt.Time.Sub(claims.IssuedAt.Time)
			if ttl > 0 {
				_ = s.tokenBlacklist.BlacklistToken(ctx, tokenID, ttl)
			}
		}
	}

	return tokens, nil
}

// Logout blacklists the provided access token to prevent further use
func (s *AuthService) Logout(ctx context.Context, accessToken string) error {
	if s.tokenBlacklist == nil {
		return nil // Blacklist not configured
	}

	// Validate the token to get its claims
	claims, err := s.jwtManager.ValidateToken(accessToken)
	if err != nil {
		// Token already invalid, nothing to blacklist
		return nil
	}

	// Blacklist the access token for its remaining validity period
	expiresAt, _ := claims.GetExpirationTime()
	if expiresAt != nil {
		ttl := expiresAt.Time.Sub(claims.IssuedAt.Time)
		if ttl > 0 {
			// Use the subject (user ID) + issued at as a unique identifier for access tokens
			tokenKey := claims.Subject + ":" + claims.IssuedAt.Time.Format("20060102150405")
			return s.tokenBlacklist.BlacklistToken(ctx, tokenKey, ttl)
		}
	}

	return nil
}

// GetTokenBlacklist returns the token blacklist service
func (s *AuthService) GetTokenBlacklist() *TokenBlacklist {
	return s.tokenBlacklist
}

func (s *AuthService) GetUser(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	return s.userRepo.GetByID(ctx, userID)
}

func (s *AuthService) UpdateUser(ctx context.Context, user *models.User) error {
	return s.userRepo.Update(ctx, user)
}

func (s *AuthService) ChangePassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return ErrInvalidCredentials
	}

	// Check new password strength
	if !isStrongPassword(newPassword) {
		return ErrWeakPassword
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), 12)
	if err != nil {
		return err
	}

	return s.userRepo.UpdatePassword(ctx, userID, string(hashedPassword))
}

func (s *AuthService) generateTokens(user *models.User) (*AuthTokens, error) {
	accessToken, err := s.jwtManager.GenerateAccessToken(user.ID, user.Email)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.jwtManager.GenerateRefreshToken(user.ID, user.Email)
	if err != nil {
		return nil, err
	}

	return &AuthTokens{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.jwtManager.GetExpiresIn().Seconds()),
		TokenType:    "Bearer",
	}, nil
}

func isStrongPassword(password string) bool {
	if len(password) < 12 {
		return false
	}

	var hasUpper, hasLower, hasNumber, hasSpecial bool
	for _, char := range password {
		switch {
		case 'A' <= char && char <= 'Z':
			hasUpper = true
		case 'a' <= char && char <= 'z':
			hasLower = true
		case '0' <= char && char <= '9':
			hasNumber = true
		default:
			hasSpecial = true
		}
	}

	return hasUpper && hasLower && hasNumber && hasSpecial
}

// RequestAccountDeletion marks an account for deletion with a grace period
func (s *AuthService) RequestAccountDeletion(ctx context.Context, userID uuid.UUID) error {
	return s.userRepo.RequestDeletion(ctx, userID)
}

// DeleteAccount permanently deletes a user account and all associated data
func (s *AuthService) DeleteAccount(ctx context.Context, userID uuid.UUID) error {
	return s.userRepo.Delete(ctx, userID)
}
