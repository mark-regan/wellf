package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/services"
)

// parseDate parses a date string in YYYY-MM-DD format
func parseDate(s string) (time.Time, error) {
	return time.Parse("2006-01-02", s)
}

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req services.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorWithDetails(w, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}

	user, err := h.authService.Register(r.Context(), &req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrEmailAlreadyExists):
			Error(w, http.StatusConflict, "Email already registered")
		case errors.Is(err, services.ErrWeakPassword):
			Error(w, http.StatusBadRequest, "Password must be at least 12 characters with uppercase, lowercase, number, and special character")
		case errors.Is(err, services.ErrInvalidEmail):
			Error(w, http.StatusBadRequest, "Invalid email format")
		default:
			Error(w, http.StatusInternalServerError, "Failed to create account")
		}
		return
	}

	JSON(w, http.StatusCreated, map[string]interface{}{
		"message": "Account created successfully",
		"user": map[string]interface{}{
			"id":            user.ID,
			"email":         user.Email,
			"display_name":  user.DisplayName,
			"base_currency": user.BaseCurrency,
		},
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req services.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	tokens, user, err := h.authService.Login(r.Context(), &req)
	if err != nil {
		if errors.Is(err, services.ErrInvalidCredentials) {
			Error(w, http.StatusUnauthorized, "Invalid credentials")
			return
		}
		if errors.Is(err, services.ErrAccountLocked) {
			Error(w, http.StatusForbidden, "Account is locked. Please contact an administrator.")
			return
		}
		Error(w, http.StatusInternalServerError, "Login failed")
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"access_token":  tokens.AccessToken,
		"refresh_token": tokens.RefreshToken,
		"expires_in":    tokens.ExpiresIn,
		"token_type":    tokens.TokenType,
		"user": map[string]interface{}{
			"id":            user.ID,
			"email":         user.Email,
			"display_name":  user.DisplayName,
			"base_currency": user.BaseCurrency,
		},
	})
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	tokens, err := h.authService.RefreshToken(r.Context(), req.RefreshToken)
	if err != nil {
		Error(w, http.StatusUnauthorized, "Invalid or expired refresh token")
		return
	}

	JSON(w, http.StatusOK, tokens)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	user, err := h.authService.GetUser(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusNotFound, "User not found")
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"id":                  user.ID,
		"email":               user.Email,
		"display_name":        user.DisplayName,
		"base_currency":       user.BaseCurrency,
		"date_format":         user.DateFormat,
		"locale":              user.Locale,
		"fire_target":         user.FireTarget,
		"fire_enabled":        user.FireEnabled,
		"theme":               user.Theme,
		"phone_number":        user.PhoneNumber,
		"date_of_birth":       user.DateOfBirth,
		"notify_email":        user.NotifyEmail,
		"notify_price_alerts": user.NotifyPriceAlerts,
		"notify_weekly":       user.NotifyWeekly,
		"notify_monthly":      user.NotifyMonthly,
		"watchlist":           user.Watchlist,
		"provider_lists":      user.ProviderLists,
		"is_admin":            user.IsAdmin,
		"created_at":          user.CreatedAt,
		"last_login_at":       user.LastLoginAt,
	})
}

func (h *AuthHandler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		DisplayName       string   `json:"display_name"`
		BaseCurrency      string   `json:"base_currency"`
		DateFormat        string   `json:"date_format"`
		Locale            string   `json:"locale"`
		FireTarget        *float64 `json:"fire_target"`
		FireEnabled       *bool    `json:"fire_enabled"`
		Theme             string   `json:"theme"`
		PhoneNumber       string   `json:"phone_number"`
		DateOfBirth       *string  `json:"date_of_birth"`
		NotifyEmail       *bool    `json:"notify_email"`
		NotifyPriceAlerts *bool    `json:"notify_price_alerts"`
		NotifyWeekly      *bool    `json:"notify_weekly"`
		NotifyMonthly     *bool    `json:"notify_monthly"`
		Watchlist         *string  `json:"watchlist"`
		ProviderLists     *string  `json:"provider_lists"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := h.authService.GetUser(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusNotFound, "User not found")
		return
	}

	if req.DisplayName != "" {
		user.DisplayName = req.DisplayName
	}
	if req.BaseCurrency != "" {
		user.BaseCurrency = req.BaseCurrency
	}
	if req.DateFormat != "" {
		user.DateFormat = req.DateFormat
	}
	if req.Locale != "" {
		user.Locale = req.Locale
	}
	if req.FireTarget != nil {
		user.FireTarget = req.FireTarget
	}
	if req.FireEnabled != nil {
		user.FireEnabled = *req.FireEnabled
	}
	if req.Theme != "" {
		user.Theme = req.Theme
	}
	// Phone number can be cleared by sending empty string explicitly
	user.PhoneNumber = req.PhoneNumber
	if req.DateOfBirth != nil {
		if *req.DateOfBirth == "" {
			user.DateOfBirth = nil
		} else {
			dob, err := parseDate(*req.DateOfBirth)
			if err == nil {
				user.DateOfBirth = &dob
			}
		}
	}
	if req.NotifyEmail != nil {
		user.NotifyEmail = *req.NotifyEmail
	}
	if req.NotifyPriceAlerts != nil {
		user.NotifyPriceAlerts = *req.NotifyPriceAlerts
	}
	if req.NotifyWeekly != nil {
		user.NotifyWeekly = *req.NotifyWeekly
	}
	if req.NotifyMonthly != nil {
		user.NotifyMonthly = *req.NotifyMonthly
	}
	if req.Watchlist != nil {
		user.Watchlist = *req.Watchlist
	}
	if req.ProviderLists != nil {
		user.ProviderLists = *req.ProviderLists
	}

	if err := h.authService.UpdateUser(r.Context(), user); err != nil {
		Error(w, http.StatusInternalServerError, "Failed to update user")
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"id":                  user.ID,
		"email":               user.Email,
		"display_name":        user.DisplayName,
		"base_currency":       user.BaseCurrency,
		"date_format":         user.DateFormat,
		"locale":              user.Locale,
		"fire_target":         user.FireTarget,
		"fire_enabled":        user.FireEnabled,
		"theme":               user.Theme,
		"phone_number":        user.PhoneNumber,
		"date_of_birth":       user.DateOfBirth,
		"notify_email":        user.NotifyEmail,
		"notify_price_alerts": user.NotifyPriceAlerts,
		"notify_weekly":       user.NotifyWeekly,
		"notify_monthly":      user.NotifyMonthly,
		"watchlist":           user.Watchlist,
		"provider_lists":      user.ProviderLists,
	})
}

func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	err := h.authService.ChangePassword(r.Context(), userID, req.CurrentPassword, req.NewPassword)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidCredentials):
			Error(w, http.StatusUnauthorized, "Current password is incorrect")
		case errors.Is(err, services.ErrWeakPassword):
			Error(w, http.StatusBadRequest, "New password does not meet requirements")
		default:
			Error(w, http.StatusInternalServerError, "Failed to change password")
		}
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "Password changed successfully"})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// For stateless JWT, logout is handled client-side
	// Optionally, we could blacklist the token in Redis
	JSON(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
}
