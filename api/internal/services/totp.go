package services

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TOTPService handles two-factor authentication
type TOTPService struct {
	pool   *pgxpool.Pool
	issuer string
}

// NewTOTPService creates a new TOTP service
func NewTOTPService(pool *pgxpool.Pool, issuer string) *TOTPService {
	return &TOTPService{
		pool:   pool,
		issuer: issuer,
	}
}

// TOTPSetup contains the data needed to set up 2FA
type TOTPSetup struct {
	Secret     string `json:"secret"`
	OTPAuthURL string `json:"otp_auth_url"`
	QRCode     string `json:"qr_code"` // Base64 encoded QR code image
}

// GenerateSecret generates a new TOTP secret
func (s *TOTPService) GenerateSecret() (string, error) {
	secret := make([]byte, 20)
	_, err := rand.Read(secret)
	if err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(secret), nil
}

// GenerateOTPAuthURL creates the otpauth:// URL for authenticator apps
func (s *TOTPService) GenerateOTPAuthURL(email, secret string) string {
	return fmt.Sprintf("otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
		s.issuer, email, secret, s.issuer)
}

// ValidateCode validates a TOTP code against the secret
func (s *TOTPService) ValidateCode(secret, code string) bool {
	// Decode secret
	secretBytes, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(secret)
	if err != nil {
		return false
	}

	// Generate expected code for current time and adjacent windows
	now := time.Now().UTC()
	for _, offset := range []int64{-1, 0, 1} {
		t := now.Unix()/30 + offset
		expectedCode := generateTOTP(secretBytes, t)
		if expectedCode == code {
			return true
		}
	}
	return false
}

// Enable2FA enables 2FA for a user (stores the secret)
func (s *TOTPService) Enable2FA(ctx context.Context, userID uuid.UUID, secret, code string) error {
	// Validate the code first
	if !s.ValidateCode(secret, code) {
		return fmt.Errorf("invalid verification code")
	}

	// Store the secret and enable 2FA
	query := `UPDATE users SET totp_secret = $1, totp_enabled = true WHERE id = $2`
	_, err := s.pool.Exec(ctx, query, secret, userID)
	if err != nil {
		return fmt.Errorf("failed to enable 2FA: %w", err)
	}

	return nil
}

// Disable2FA disables 2FA for a user
func (s *TOTPService) Disable2FA(ctx context.Context, userID uuid.UUID, code string) error {
	// Get the current secret
	var secret *string
	query := `SELECT totp_secret FROM users WHERE id = $1`
	err := s.pool.QueryRow(ctx, query, userID).Scan(&secret)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	if secret == nil || *secret == "" {
		return fmt.Errorf("2FA is not enabled")
	}

	// Validate the code
	if !s.ValidateCode(*secret, code) {
		return fmt.Errorf("invalid verification code")
	}

	// Disable 2FA
	query = `UPDATE users SET totp_secret = NULL, totp_enabled = false WHERE id = $1`
	_, err = s.pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to disable 2FA: %w", err)
	}

	return nil
}

// Verify2FA verifies a TOTP code for a user during login
func (s *TOTPService) Verify2FA(ctx context.Context, userID uuid.UUID, code string) (bool, error) {
	var secret *string
	var enabled bool
	query := `SELECT totp_secret, totp_enabled FROM users WHERE id = $1`
	err := s.pool.QueryRow(ctx, query, userID).Scan(&secret, &enabled)
	if err != nil {
		return false, fmt.Errorf("failed to get user: %w", err)
	}

	if !enabled || secret == nil {
		return true, nil // 2FA not enabled, pass through
	}

	return s.ValidateCode(*secret, code), nil
}

// Is2FAEnabled checks if a user has 2FA enabled
func (s *TOTPService) Is2FAEnabled(ctx context.Context, userID uuid.UUID) (bool, error) {
	var enabled bool
	query := `SELECT COALESCE(totp_enabled, false) FROM users WHERE id = $1`
	err := s.pool.QueryRow(ctx, query, userID).Scan(&enabled)
	if err != nil {
		return false, err
	}
	return enabled, nil
}

// GenerateBackupCodes generates backup codes for account recovery
func (s *TOTPService) GenerateBackupCodes(ctx context.Context, userID uuid.UUID) ([]string, error) {
	codes := make([]string, 10)
	for i := 0; i < 10; i++ {
		code := make([]byte, 4)
		rand.Read(code)
		codes[i] = fmt.Sprintf("%08X", code)
	}

	// Store hashed backup codes (simplified - in production, hash these)
	// For now, just store them comma-separated
	codesStr := ""
	for i, c := range codes {
		if i > 0 {
			codesStr += ","
		}
		codesStr += c
	}

	query := `UPDATE users SET totp_backup_codes = $1 WHERE id = $2`
	_, err := s.pool.Exec(ctx, query, codesStr, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to store backup codes: %w", err)
	}

	return codes, nil
}

// generateTOTP generates a TOTP code using the HMAC-based algorithm
func generateTOTP(secret []byte, counter int64) string {
	// Convert counter to bytes (big-endian)
	counterBytes := make([]byte, 8)
	binary.BigEndian.PutUint64(counterBytes, uint64(counter))

	// Calculate HMAC-SHA1
	h := hmac.New(sha1.New, secret)
	h.Write(counterBytes)
	hash := h.Sum(nil)

	// Dynamic truncation
	offset := hash[len(hash)-1] & 0x0f
	code := int64(hash[offset]&0x7f)<<24 |
		int64(hash[offset+1]&0xff)<<16 |
		int64(hash[offset+2]&0xff)<<8 |
		int64(hash[offset+3]&0xff)

	// Get 6-digit code
	code = code % 1000000

	return fmt.Sprintf("%06d", code)
}
