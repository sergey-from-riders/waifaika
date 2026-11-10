package main

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"wifiyka/backend/internal/app"
	"wifiyka/backend/internal/config"
	"wifiyka/backend/internal/httpapi"
	"wifiyka/backend/internal/mail"
	"wifiyka/backend/internal/static"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
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
	if cfg.AppEnv == "production" {
		mailerImpl = mail.UnavailableMailer{}
	}
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
	var legalDocsHandler http.Handler
	legalDocsHandler, err = static.NewLegalDocs(cfg.LegalDocsDir)
	if err != nil {
		logger.Error("legal docs setup failed", "error", err)
		os.Exit(1)
	}
	var offlineHandler http.Handler
	if strings.TrimSpace(cfg.OfflinePacksDir) != "" {
		offlineHandler = http.FileServer(http.Dir(cfg.OfflinePacksDir))
	}

	router := httpapi.New(
		service,
		staticHandler,
		offlineHandler,
		legalDocsHandler,
		cfg.SessionCookieName,
		strings.HasPrefix(cfg.BaseURL, "https://"),
	)
	server := &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
	logger.Info("server starting", "listen_addr", cfg.ListenAddr)
	shutdownDone := make(chan struct{})
	go func() {
		defer close(shutdownDone)
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			logger.Error("graceful shutdown failed")
			_ = server.Close()
		}
	}()
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
	<-shutdownDone
}

func migrate(databaseURL string) error {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return err
	}
	defer db.Close()

	dir := filepath.Clean(filepath.Join("..", "migrations"))
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	return goose.Up(db, dir)
}
