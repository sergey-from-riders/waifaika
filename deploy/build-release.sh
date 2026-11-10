#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
WEB_DIR="$ROOT/web"
STATIC_EMBED_DIR="$BACKEND_DIR/internal/static/webdist"
DIST_DIR="$ROOT/dist"
OPENAPI_SOURCE="$ROOT/docs/openapi.yaml"
OPENAPI_PUBLIC="$WEB_DIR/public/openapi.yaml"
GO_BIN="${GO_BIN:-/usr/local/go/bin/go}"
GO_TOOLCHAIN="${GO_TOOLCHAIN:-go1.26.10+auto}"

if [[ -f "$HOME/.nvm/nvm.sh" ]]; then . "$HOME/.nvm/nvm.sh"; fi

mkdir -p "$DIST_DIR"
cp "$OPENAPI_SOURCE" "$OPENAPI_PUBLIC"

cd "$WEB_DIR"
npm ci
npm run build

rm -rf "$STATIC_EMBED_DIR"
mkdir -p "$STATIC_EMBED_DIR"
cp -R "$WEB_DIR/dist/." "$STATIC_EMBED_DIR/"

cd "$BACKEND_DIR"
GOTOOLCHAIN="$GO_TOOLCHAIN" "$GO_BIN" build -o "$DIST_DIR/wifiyka-server" ./cmd/server

printf "Release build is ready in %s\n" "$DIST_DIR"
