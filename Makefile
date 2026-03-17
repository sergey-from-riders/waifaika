ROOT := $(CURDIR)
BACKEND_DIR := $(ROOT)/backend
WEB_DIR := $(ROOT)/web
STATIC_EMBED_DIR := $(BACKEND_DIR)/internal/static/webdist
GOTOOLCHAIN ?= go1.25.8+auto
GO := GOTOOLCHAIN=$(GOTOOLCHAIN) /usr/local/go/bin/go

.PHONY: help web-install web-build web-test backend-test prepare-static build migrate dev-up dev-down run-backend

help:
	@printf "Targets:\n"
	@printf "  web-install    Install frontend dependencies\n"
	@printf "  web-build      Build static frontend dist\n"
	@printf "  web-test       Run frontend tests\n"
	@printf "  backend-test   Run backend tests\n"
	@printf "  prepare-static Copy web/dist into backend embedded webdist\n"
	@printf "  build          Build backend binary with embedded frontend fallback\n"
	@printf "  migrate        Run SQL migrations via backend command\n"
	@printf "  dev-up         Start local postgres/mailpit via docker compose\n"
	@printf "  dev-down       Stop local docker compose stack\n"
	@printf "  run-backend    Run backend against current env\n"

web-install:
	cd $(WEB_DIR) && . "$$HOME/.nvm/nvm.sh" && npm install

web-build:
	cd $(WEB_DIR) && . "$$HOME/.nvm/nvm.sh" && npm run build

web-test:
	cd $(WEB_DIR) && . "$$HOME/.nvm/nvm.sh" && npm test

backend-test:
	cd $(BACKEND_DIR) && $(GO) test ./...

prepare-static:
	rm -rf $(STATIC_EMBED_DIR)
	mkdir -p $(STATIC_EMBED_DIR)
	cp -R $(WEB_DIR)/dist/. $(STATIC_EMBED_DIR)/

build: web-build prepare-static
	cd $(BACKEND_DIR) && $(GO) build -o $(ROOT)/dist/wifiyka-server ./cmd/server

migrate:
	cd $(BACKEND_DIR) && $(GO) run ./cmd/server migrate

dev-up:
	cd $(ROOT)/deploy && docker compose up -d

dev-down:
	cd $(ROOT)/deploy && docker compose down -v

run-backend:
	cd $(BACKEND_DIR) && $(GO) run ./cmd/server
