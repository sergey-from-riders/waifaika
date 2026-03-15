#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
WEB_DIR="$ROOT/web"
STATIC_EMBED_DIR="$BACKEND_DIR/internal/static/webdist"
DIST_DIR="$ROOT/dist"
OPENAPI_SOURCE="$ROOT/docs/openapi.yaml"
OPENAPI_PUBLIC="$WEB_DIR/public/openapi.yaml"

. "$HOME/.nvm/nvm.sh"

mkdir -p "$DIST_DIR"
cp "$OPENAPI_SOURCE" "$OPENAPI_PUBLIC"

cd "$WEB_DIR"
npm install
npm run build

rm -rf "$STATIC_EMBED_DIR"
mkdir -p "$STATIC_EMBED_DIR"
cp -R "$WEB_DIR/dist/." "$STATIC_EMBED_DIR/"

cd "$BACKEND_DIR"
/usr/local/go/bin/go build -o "$DIST_DIR/wifiyka-server" ./cmd/server

printf "Release build is ready in %s\n" "$DIST_DIR"
