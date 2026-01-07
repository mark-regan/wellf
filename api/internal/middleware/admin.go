package middleware

import (
	"net/http"

	"github.com/mark-regan/wellf/internal/repository"
)

// AdminOnly middleware checks if the user has admin privileges
func AdminOnly(userRepo *repository.UserRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := GetUserID(r.Context())
			if !ok {
				http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
				return
			}

			user, err := userRepo.GetByID(r.Context(), userID)
			if err != nil {
				http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
				return
			}

			if !user.IsAdmin {
				http.Error(w, `{"error":"Admin access required"}`, http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
