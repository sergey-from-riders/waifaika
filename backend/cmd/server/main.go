package main

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pressly/goose/v3"

	"wifiyka/backend/internal/app"
	"wifiyka/backend/internal/config"
	"wifiyka/backend/internal/httpapi"
	"wifiyka/backend/internal/mail"
	"wifiyka/backend/internal/static"
)

func main() {
	ctx := context.Background()
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{}))

	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		if err := migrate(cfg.DatabaseURL); err != nil {
			logger.Error("migrate failed", "error", err)
			os.Exit(1)
		}
		logger.Info("migrations applied")
		return
	}

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("db connect failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	var mailerImpl mail.Mailer = &mail.MemoryMailer{}
	if strings.TrimSpace(cfg.SMTPHost) != "" && strings.TrimSpace(cfg.SMTPFrom) != "" {
		mailerImpl = mail.SMTPMailer{
			Host:     cfg.SMTPHost,
			Port:     cfg.SMTPPort,
			Username: cfg.SMTPUsername,
			Password: cfg.SMTPPassword,
			From:     cfg.SMTPFrom,
			FromName: cfg.SMTPFromName,
		}
	}

	service := app.New(cfg, logger, pool, mailerImpl)
	var staticHandler http.Handler
	handler, err := static.New(cfg.StaticDir)
	if err != nil {
		logger.Error("static setup failed", "error", err)
		os.Exit(1)
	}
	staticHandler = handler
	var offlineHandler http.Handler
	if strings.TrimSpace(cfg.OfflinePacksDir) != "" {
		offlineHandler = http.FileServer(http.Dir(cfg.OfflinePacksDir))
	}

	router := httpapi.New(service, staticHandler, offlineHandler, cfg.SessionCookieName, strings.HasPrefix(cfg.BaseURL, "https://"))
	logger.Info("server starting", "listen_addr", cfg.ListenAddr)
	if err := http.ListenAndServe(cfg.ListenAddr, router); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func migrate(databaseURL string) error {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return err
	}
	defer db.Close()

	dir := filepath.Clean(filepath.Join("..", "migrations"))
	goose.SetDialect("postgres")
	return goose.Up(db, dir)
}
