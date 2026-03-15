package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AppEnv             string
	ListenAddr         string
	DatabaseURL        string
	BaseURL            string
	SessionCookieName  string
	SessionTTL         time.Duration
	MagicLinkTTL       time.Duration
	SMTPHost           string
	SMTPPort           int
	SMTPUsername       string
	SMTPPassword       string
	SMTPFrom           string
	SMTPFromName       string
	StaticDir          string
	OfflinePacksDir    string
	OfflinePacksBase   string
	DefaultMapCenterLat float64
	DefaultMapCenterLng float64
}

func Load() (Config, error) {
	cfg := Config{
		AppEnv:              getenv("APP_ENV", "development"),
		ListenAddr:          getenv("LISTEN_ADDR", ":8098"),
		DatabaseURL:         os.Getenv("DATABASE_URL"),
		BaseURL:             getenv("BASE_URL", "http://localhost:8098"),
		SessionCookieName:   getenv("SESSION_COOKIE_NAME", "wifiyka_session"),
		SessionTTL:          durationEnv("SESSION_TTL", 30*24*time.Hour),
		MagicLinkTTL:        durationEnv("MAGIC_LINK_TTL", 20*time.Minute),
		SMTPHost:            os.Getenv("SMTP_HOST"),
		SMTPPort:            intEnv("SMTP_PORT", 465),
		SMTPUsername:        os.Getenv("SMTP_USERNAME"),
		SMTPPassword:        os.Getenv("SMTP_PASSWORD"),
		SMTPFrom:            os.Getenv("SMTP_FROM"),
		SMTPFromName:        getenv("SMTP_FROM_NAME", "Wifiyka"),
		StaticDir:           os.Getenv("STATIC_DIR"),
		OfflinePacksDir:     getenv("OFFLINE_PACKS_DIR", "./offline-packs"),
		OfflinePacksBase:    getenv("OFFLINE_PACKS_BASE_URL", "/offline-packs"),
		DefaultMapCenterLat: floatEnv("DEFAULT_MAP_CENTER_LAT", 43.5854823),
		DefaultMapCenterLng: floatEnv("DEFAULT_MAP_CENTER_LNG", 39.7231090),
	}

	if strings.TrimSpace(cfg.DatabaseURL) == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}
	if !strings.HasPrefix(cfg.BaseURL, "http://") && !strings.HasPrefix(cfg.BaseURL, "https://") {
		return Config{}, fmt.Errorf("BASE_URL must start with http:// or https://")
	}

	return cfg, nil
}

func getenv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func intEnv(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

func floatEnv(key string, fallback float64) float64 {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return fallback
	}
	return value
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := time.ParseDuration(raw)
	if err != nil {
		return fallback
	}
	return value
}
