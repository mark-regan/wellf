package config

import (
	"os"
	"time"
)

type Config struct {
	Server    ServerConfig
	Database  DatabaseConfig
	Redis     RedisConfig
	JWT       JWTConfig
	Yahoo     YahooConfig
	Paperless PaperlessConfig
}

type PaperlessConfig struct {
	URL      string
	APIToken string
}

type ServerConfig struct {
	Port         string
	BaseCurrency string
	LogLevel     string
}

type DatabaseConfig struct {
	URL string
}

type RedisConfig struct {
	URL string
}

type JWTConfig struct {
	Secret           string
	ExpiresIn        time.Duration
	RefreshExpiresIn time.Duration
}

type YahooConfig struct {
	CacheTTL time.Duration
}

func Load() (*Config, error) {
	jwtExpiresIn, err := time.ParseDuration(getEnv("JWT_EXPIRES_IN", "15m"))
	if err != nil {
		jwtExpiresIn = 15 * time.Minute
	}

	jwtRefreshExpiresIn, err := time.ParseDuration(getEnv("JWT_REFRESH_EXPIRES_IN", "7d"))
	if err != nil {
		jwtRefreshExpiresIn = 7 * 24 * time.Hour
	}

	yahooCacheTTL, err := time.ParseDuration(getEnv("YAHOO_CACHE_TTL", "10m"))
	if err != nil {
		yahooCacheTTL = 10 * time.Minute
	}

	return &Config{
		Server: ServerConfig{
			Port:         getEnv("API_PORT", "4020"),
			BaseCurrency: getEnv("BASE_CURRENCY", "GBP"),
			LogLevel:     getEnv("LOG_LEVEL", "info"),
		},
		Database: DatabaseConfig{
			URL: getEnv("DATABASE_URL", "postgres://wellf:wellf@localhost:5432/wellf?sslmode=disable"),
		},
		Redis: RedisConfig{
			URL: getEnv("REDIS_URL", "redis://localhost:6379"),
		},
		JWT: JWTConfig{
			Secret:           getEnv("JWT_SECRET", "dev-secret-change-in-production"),
			ExpiresIn:        jwtExpiresIn,
			RefreshExpiresIn: jwtRefreshExpiresIn,
		},
		Yahoo: YahooConfig{
			CacheTTL: yahooCacheTTL,
		},
		Paperless: PaperlessConfig{
			URL:      getEnv("PAPERLESS_URL", ""),
			APIToken: getEnv("PAPERLESS_API_KEY", ""),
		},
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
