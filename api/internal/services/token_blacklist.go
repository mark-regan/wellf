package services

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// TokenBlacklist manages blacklisted tokens in Redis
type TokenBlacklist struct {
	redis *redis.Client
}

// NewTokenBlacklist creates a new token blacklist service
func NewTokenBlacklist(redisClient *redis.Client) *TokenBlacklist {
	return &TokenBlacklist{
		redis: redisClient,
	}
}

// BlacklistToken adds a token to the blacklist with the given TTL
// The TTL should match the token's remaining validity period
func (tb *TokenBlacklist) BlacklistToken(ctx context.Context, tokenID string, ttl time.Duration) error {
	if tokenID == "" {
		return nil // Nothing to blacklist
	}
	key := fmt.Sprintf("token_blacklist:%s", tokenID)
	return tb.redis.Set(ctx, key, "1", ttl).Err()
}

// IsBlacklisted checks if a token ID is in the blacklist
func (tb *TokenBlacklist) IsBlacklisted(ctx context.Context, tokenID string) (bool, error) {
	if tokenID == "" {
		return false, nil
	}
	key := fmt.Sprintf("token_blacklist:%s", tokenID)
	exists, err := tb.redis.Exists(ctx, key).Result()
	if err != nil {
		return false, err
	}
	return exists > 0, nil
}

// BlacklistUserTokens blacklists all tokens for a user (used when account is locked)
// This uses a user-level key that the middleware can check
func (tb *TokenBlacklist) BlacklistUserTokens(ctx context.Context, userID string, ttl time.Duration) error {
	key := fmt.Sprintf("user_tokens_invalid:%s", userID)
	return tb.redis.Set(ctx, key, time.Now().Unix(), ttl).Err()
}

// GetUserTokensInvalidatedAt returns the timestamp when user tokens were invalidated
// Returns 0 if no invalidation is set
func (tb *TokenBlacklist) GetUserTokensInvalidatedAt(ctx context.Context, userID string) (int64, error) {
	key := fmt.Sprintf("user_tokens_invalid:%s", userID)
	result, err := tb.redis.Get(ctx, key).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return result, err
}
