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
)

type AuthService struct {
	userRepo   *repository.UserRepository
	jwtManager *jwt.Manager
	validator  *validator.Validator
}

func NewAuthService(userRepo *repository.UserRepository, jwtManager *jwt.Manager, v *validator.Validator) *AuthService {
	return &AuthService{
		userRepo:   userRepo,
		jwtManager: jwtManager,
		validator:  v,
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

	return user, nil
}

func (s *AuthService) Login(ctx context.Context, req *LoginRequest) (*AuthTokens, *models.User, error) {
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, nil, ErrInvalidCredentials
		}
		return nil, nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	// Update last login
	_ = s.userRepo.UpdateLastLogin(ctx, user.ID)

	tokens, err := s.generateTokens(user)
	if err != nil {
		return nil, nil, err
	}

	return tokens, user, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*AuthTokens, error) {
	claims, err := s.jwtManager.ValidateToken(refreshToken)
	if err != nil {
		return nil, err
	}

	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, err
	}

	return s.generateTokens(user)
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
