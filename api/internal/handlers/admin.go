package handlers

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"math/big"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/mark-regan/wellf/internal/middleware"
	"github.com/mark-regan/wellf/internal/repository"
)

type AdminHandler struct {
	userRepo *repository.UserRepository
}

func NewAdminHandler(userRepo *repository.UserRepository) *AdminHandler {
	return &AdminHandler{userRepo: userRepo}
}

// AdminUser is the response format for user list
type AdminUser struct {
	ID          uuid.UUID  `json:"id"`
	Email       string     `json:"email"`
	DisplayName string     `json:"display_name,omitempty"`
	IsAdmin     bool       `json:"is_admin"`
	IsLocked    bool       `json:"is_locked"`
	CreatedAt   time.Time  `json:"created_at"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
}

// ListUsers returns all users
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.userRepo.List(r.Context())
	if err != nil {
		http.Error(w, `{"error":"Failed to list users"}`, http.StatusInternalServerError)
		return
	}

	// Map to AdminUser response format (hide sensitive fields)
	adminUsers := make([]AdminUser, len(users))
	for i, u := range users {
		adminUsers[i] = AdminUser{
			ID:          u.ID,
			Email:       u.Email,
			DisplayName: u.DisplayName,
			IsAdmin:     u.IsAdmin,
			IsLocked:    u.IsLocked,
			CreatedAt:   u.CreatedAt,
			LastLoginAt: u.LastLoginAt,
		}
	}

	json.NewEncoder(w).Encode(adminUsers)
}

// DeleteUser removes a user and all their data
func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	targetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, `{"error":"Invalid user ID"}`, http.StatusBadRequest)
		return
	}

	// Cannot delete yourself
	currentUserID, _ := middleware.GetUserID(r.Context())
	if targetID == currentUserID {
		http.Error(w, `{"error":"Cannot delete your own account"}`, http.StatusBadRequest)
		return
	}

	err = h.userRepo.Delete(r.Context(), targetID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			http.Error(w, `{"error":"User not found"}`, http.StatusNotFound)
			return
		}
		http.Error(w, `{"error":"Failed to delete user"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// LockUser locks a user account
func (h *AdminHandler) LockUser(w http.ResponseWriter, r *http.Request) {
	targetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, `{"error":"Invalid user ID"}`, http.StatusBadRequest)
		return
	}

	// Cannot lock yourself
	currentUserID, _ := middleware.GetUserID(r.Context())
	if targetID == currentUserID {
		http.Error(w, `{"error":"Cannot lock your own account"}`, http.StatusBadRequest)
		return
	}

	err = h.userRepo.SetLocked(r.Context(), targetID, true)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			http.Error(w, `{"error":"User not found"}`, http.StatusNotFound)
			return
		}
		http.Error(w, `{"error":"Failed to lock user"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "User locked successfully"})
}

// UnlockUser unlocks a user account
func (h *AdminHandler) UnlockUser(w http.ResponseWriter, r *http.Request) {
	targetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, `{"error":"Invalid user ID"}`, http.StatusBadRequest)
		return
	}

	err = h.userRepo.SetLocked(r.Context(), targetID, false)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			http.Error(w, `{"error":"User not found"}`, http.StatusNotFound)
			return
		}
		http.Error(w, `{"error":"Failed to unlock user"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "User unlocked successfully"})
}

// SetAdminRequest is the request body for SetAdmin
type SetAdminRequest struct {
	IsAdmin bool `json:"is_admin"`
}

// SetAdmin updates the admin status of a user
func (h *AdminHandler) SetAdmin(w http.ResponseWriter, r *http.Request) {
	targetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, `{"error":"Invalid user ID"}`, http.StatusBadRequest)
		return
	}

	var req SetAdminRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	currentUserID, _ := middleware.GetUserID(r.Context())

	// Cannot demote yourself
	if targetID == currentUserID && !req.IsAdmin {
		http.Error(w, `{"error":"Cannot remove your own admin status"}`, http.StatusBadRequest)
		return
	}

	// If demoting, check if this is the last admin
	if !req.IsAdmin {
		count, err := h.userRepo.CountAdmins(r.Context())
		if err != nil {
			http.Error(w, `{"error":"Failed to check admin count"}`, http.StatusInternalServerError)
			return
		}

		// Check if target user is currently an admin
		targetUser, err := h.userRepo.GetByID(r.Context(), targetID)
		if err != nil {
			if errors.Is(err, repository.ErrUserNotFound) {
				http.Error(w, `{"error":"User not found"}`, http.StatusNotFound)
				return
			}
			http.Error(w, `{"error":"Failed to get user"}`, http.StatusInternalServerError)
			return
		}

		if targetUser.IsAdmin && count <= 1 {
			http.Error(w, `{"error":"Cannot remove the last admin"}`, http.StatusBadRequest)
			return
		}
	}

	err = h.userRepo.SetAdmin(r.Context(), targetID, req.IsAdmin)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			http.Error(w, `{"error":"User not found"}`, http.StatusNotFound)
			return
		}
		http.Error(w, `{"error":"Failed to update admin status"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Admin status updated successfully"})
}

// ResetPasswordResponse contains the new generated password
type ResetPasswordResponse struct {
	Password string `json:"password"`
}

// ResetPassword generates a new random password for a user
func (h *AdminHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	targetID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, `{"error":"Invalid user ID"}`, http.StatusBadRequest)
		return
	}

	// Generate a random password
	password, err := generateSecurePassword(16)
	if err != nil {
		http.Error(w, `{"error":"Failed to generate password"}`, http.StatusInternalServerError)
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		http.Error(w, `{"error":"Failed to hash password"}`, http.StatusInternalServerError)
		return
	}

	// Update the user's password
	err = h.userRepo.UpdatePassword(r.Context(), targetID, string(hashedPassword))
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			http.Error(w, `{"error":"User not found"}`, http.StatusNotFound)
			return
		}
		http.Error(w, `{"error":"Failed to reset password"}`, http.StatusInternalServerError)
		return
	}

	// Return the new password (shown only once)
	json.NewEncoder(w).Encode(ResetPasswordResponse{Password: password})
}

// generateSecurePassword generates a cryptographically secure random password
func generateSecurePassword(length int) (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	password := make([]byte, length)

	for i := range password {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		password[i] = charset[num.Int64()]
	}

	return string(password), nil
}
