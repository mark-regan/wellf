package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/services"
)

// SecurityHandler handles security-related HTTP requests
type SecurityHandler struct {
	exportService *services.DataExportService
	totpService   *services.TOTPService
	authService   *services.AuthService
}

// NewSecurityHandler creates a new security handler
func NewSecurityHandler(
	exportService *services.DataExportService,
	totpService *services.TOTPService,
	authService *services.AuthService,
) *SecurityHandler {
	return &SecurityHandler{
		exportService: exportService,
		totpService:   totpService,
		authService:   authService,
	}
}

// Routes returns the security routes
func (h *SecurityHandler) Routes() chi.Router {
	r := chi.NewRouter()

	// Data Export
	r.Get("/export", h.exportData)
	r.Get("/export/download", h.downloadExport)

	// Two-Factor Authentication
	r.Get("/2fa/status", h.get2FAStatus)
	r.Post("/2fa/setup", h.setup2FA)
	r.Post("/2fa/enable", h.enable2FA)
	r.Post("/2fa/disable", h.disable2FA)
	r.Post("/2fa/verify", h.verify2FA)
	r.Post("/2fa/backup-codes", h.generateBackupCodes)

	// Account Management
	r.Post("/delete-account", h.requestAccountDeletion)
	r.Post("/delete-account/confirm", h.confirmAccountDeletion)

	return r
}

// =============================================================================
// Data Export Handlers
// =============================================================================

func (h *SecurityHandler) exportData(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	export, err := h.exportService.ExportUserData(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to export data")
		return
	}

	JSON(w, http.StatusOK, export)
}

func (h *SecurityHandler) downloadExport(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	zipData, err := h.exportService.ExportAsZip(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to export data")
		return
	}

	// Set headers for ZIP download
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"liyf-export-%s.zip\"", time.Now().Format("2006-01-02")))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(zipData)))

	w.Write(zipData)
}

// =============================================================================
// Two-Factor Authentication Handlers
// =============================================================================

func (h *SecurityHandler) get2FAStatus(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	enabled, err := h.totpService.Is2FAEnabled(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to check 2FA status")
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"enabled": enabled,
	})
}

func (h *SecurityHandler) setup2FA(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Check if already enabled
	enabled, err := h.totpService.Is2FAEnabled(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to check 2FA status")
		return
	}
	if enabled {
		Error(w, http.StatusBadRequest, "2FA is already enabled")
		return
	}

	// Get user email for the OTP auth URL
	user, err := h.authService.GetUser(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to get user")
		return
	}

	// Generate secret
	secret, err := h.totpService.GenerateSecret()
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to generate secret")
		return
	}

	// Generate OTP auth URL
	otpAuthURL := h.totpService.GenerateOTPAuthURL(user.Email, secret)

	JSON(w, http.StatusOK, map[string]interface{}{
		"secret":       secret,
		"otp_auth_url": otpAuthURL,
	})
}

func (h *SecurityHandler) enable2FA(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		Secret string `json:"secret"`
		Code   string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Secret == "" || req.Code == "" {
		Error(w, http.StatusBadRequest, "Secret and code are required")
		return
	}

	err := h.totpService.Enable2FA(r.Context(), userID, req.Secret, req.Code)
	if err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	// Generate backup codes
	backupCodes, err := h.totpService.GenerateBackupCodes(r.Context(), userID)
	if err != nil {
		// 2FA is enabled but backup codes failed - still return success
		JSON(w, http.StatusOK, map[string]interface{}{
			"success":      true,
			"message":      "2FA enabled successfully",
			"backup_codes": []string{},
		})
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"success":      true,
		"message":      "2FA enabled successfully",
		"backup_codes": backupCodes,
	})
}

func (h *SecurityHandler) disable2FA(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Code == "" {
		Error(w, http.StatusBadRequest, "Verification code is required")
		return
	}

	err := h.totpService.Disable2FA(r.Context(), userID, req.Code)
	if err != nil {
		Error(w, http.StatusBadRequest, err.Error())
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "2FA disabled successfully",
	})
}

func (h *SecurityHandler) verify2FA(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	valid, err := h.totpService.Verify2FA(r.Context(), userID, req.Code)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to verify code")
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"valid": valid,
	})
}

func (h *SecurityHandler) generateBackupCodes(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Verify 2FA is enabled first
	enabled, err := h.totpService.Is2FAEnabled(r.Context(), userID)
	if err != nil || !enabled {
		Error(w, http.StatusBadRequest, "2FA must be enabled to generate backup codes")
		return
	}

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Verify the user's current 2FA code
	valid, _ := h.totpService.Verify2FA(r.Context(), userID, req.Code)
	if !valid {
		Error(w, http.StatusUnauthorized, "Invalid verification code")
		return
	}

	codes, err := h.totpService.GenerateBackupCodes(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to generate backup codes")
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"backup_codes": codes,
	})
}

// =============================================================================
// Account Deletion Handlers
// =============================================================================

func (h *SecurityHandler) requestAccountDeletion(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Verify password
	user, err := h.authService.GetUser(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusNotFound, "User not found")
		return
	}

	// Validate password using auth service
	_, _, err = h.authService.Login(r.Context(), &services.LoginRequest{
		Email:    user.Email,
		Password: req.Password,
	})
	if err != nil {
		Error(w, http.StatusUnauthorized, "Invalid password")
		return
	}

	// Mark account for deletion (give 14 days grace period)
	err = h.authService.RequestAccountDeletion(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to initiate account deletion")
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Account deletion initiated. Your account will be permanently deleted in 14 days. You can cancel this by logging in before then.",
	})
}

func (h *SecurityHandler) confirmAccountDeletion(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		Password    string `json:"password"`
		Confirmation string `json:"confirmation"` // Must be "DELETE MY ACCOUNT"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Confirmation != "DELETE MY ACCOUNT" {
		Error(w, http.StatusBadRequest, "Please type 'DELETE MY ACCOUNT' to confirm")
		return
	}

	// Verify password
	user, err := h.authService.GetUser(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusNotFound, "User not found")
		return
	}

	_, _, err = h.authService.Login(r.Context(), &services.LoginRequest{
		Email:    user.Email,
		Password: req.Password,
	})
	if err != nil {
		Error(w, http.StatusUnauthorized, "Invalid password")
		return
	}

	// Immediately delete the account
	err = h.authService.DeleteAccount(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "Failed to delete account")
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Account deleted successfully",
	})
}
