package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
)

type RateLimiter struct {
	redis      *redis.Client
	limit      int
	window     time.Duration
	keyPrefix  string
}

func NewRateLimiter(redisClient *redis.Client, limit int, window time.Duration, keyPrefix string) *RateLimiter {
	return &RateLimiter{
		redis:     redisClient,
		limit:     limit,
		window:    window,
		keyPrefix: keyPrefix,
	}
}

func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// Get client identifier (user ID if authenticated, IP otherwise)
		key := rl.getKey(r)

		allowed, remaining, resetAt, err := rl.isAllowed(ctx, key)
		if err != nil {
			// If Redis fails, allow the request but log the error
			next.ServeHTTP(w, r)
			return
		}

		// Set rate limit headers
		w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", rl.limit))
		w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", resetAt.Unix()))

		if !allowed {
			w.Header().Set("Retry-After", fmt.Sprintf("%d", int(time.Until(resetAt).Seconds())))
			http.Error(w, `{"error":"Rate limit exceeded"}`, http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (rl *RateLimiter) getKey(r *http.Request) string {
	// Try to get user ID from context (authenticated user)
	if userID, ok := GetUserID(r.Context()); ok {
		return fmt.Sprintf("%s:user:%s", rl.keyPrefix, userID.String())
	}

	// Fall back to IP address
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.Header.Get("X-Real-IP")
	}
	if ip == "" {
		ip = r.RemoteAddr
	}

	return fmt.Sprintf("%s:ip:%s", rl.keyPrefix, ip)
}

func (rl *RateLimiter) isAllowed(ctx context.Context, key string) (bool, int, time.Time, error) {
	now := time.Now()
	windowStart := now.Truncate(rl.window)
	resetAt := windowStart.Add(rl.window)

	pipe := rl.redis.Pipeline()

	// Increment the counter
	incrCmd := pipe.Incr(ctx, key)

	// Set expiration if key is new
	pipe.ExpireNX(ctx, key, rl.window)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return false, 0, resetAt, err
	}

	count := int(incrCmd.Val())
	remaining := rl.limit - count
	if remaining < 0 {
		remaining = 0
	}

	return count <= rl.limit, remaining, resetAt, nil
}

// LoginRateLimiter specifically for login attempts
type LoginRateLimiter struct {
	redis     *redis.Client
	maxAttempts int
	lockDuration time.Duration
}

func NewLoginRateLimiter(redisClient *redis.Client, maxAttempts int, lockDuration time.Duration) *LoginRateLimiter {
	return &LoginRateLimiter{
		redis:        redisClient,
		maxAttempts:  maxAttempts,
		lockDuration: lockDuration,
	}
}

func (lrl *LoginRateLimiter) CheckAndIncrement(ctx context.Context, identifier string) (bool, time.Duration, error) {
	key := fmt.Sprintf("login_attempts:%s", identifier)
	lockKey := fmt.Sprintf("login_locked:%s", identifier)

	// Check if account is locked
	locked, err := lrl.redis.Exists(ctx, lockKey).Result()
	if err != nil {
		return true, 0, err // Allow on error
	}
	if locked > 0 {
		ttl, _ := lrl.redis.TTL(ctx, lockKey).Result()
		return false, ttl, nil
	}

	// Increment attempt counter
	attempts, err := lrl.redis.Incr(ctx, key).Result()
	if err != nil {
		return true, 0, err
	}

	// Set expiration on first attempt
	if attempts == 1 {
		lrl.redis.Expire(ctx, key, 15*time.Minute)
	}

	// Check if exceeded
	if int(attempts) >= lrl.maxAttempts {
		// Lock the account
		lrl.redis.Set(ctx, lockKey, "1", lrl.lockDuration)
		lrl.redis.Del(ctx, key)
		return false, lrl.lockDuration, nil
	}

	return true, 0, nil
}

func (lrl *LoginRateLimiter) Reset(ctx context.Context, identifier string) error {
	key := fmt.Sprintf("login_attempts:%s", identifier)
	return lrl.redis.Del(ctx, key).Err()
}
