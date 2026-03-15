package static

import (
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type Handler struct {
	root http.FileSystem
}

func New(dir string) (*Handler, error) {
	if dir != "" {
		clean := filepath.Clean(dir)
		info, err := os.Stat(clean)
		if err == nil && info.IsDir() {
			return &Handler{root: http.Dir(clean)}, nil
		}
	}
	embedded, err := embeddedFS()
	if err == nil {
		return &Handler{root: http.FS(embedded)}, nil
	}
	if dir == "" {
		return nil, nil
	}
	return nil, err
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if h == nil {
		http.NotFound(w, r)
		return
	}
	path := r.URL.Path
	if path == "" || path == "/" {
		path = "/index.html"
	}
	applyCacheHeaders(w, path)

	file, err := h.root.Open(path)
	if err != nil {
		if !shouldServeIndexFallback(path) {
			http.NotFound(w, r)
			return
		}
		index, indexErr := h.root.Open("/index.html")
		if indexErr != nil {
			http.NotFound(w, r)
			return
		}
		defer index.Close()
		stat, _ := index.Stat()
		http.ServeContent(w, r, "index.html", stat.ModTime(), seekable(index))
		return
	}
	defer file.Close()
	stat, _ := file.Stat()
	http.ServeContent(w, r, stat.Name(), stat.ModTime(), seekable(file))
}

func seekable(file fs.File) io.ReadSeeker {
	if reader, ok := file.(io.ReadSeeker); ok {
		return reader
	}
	return nil
}

func shouldServeIndexFallback(path string) bool {
	return path == "/" || path == "" || filepath.Ext(path) == ""
}

func applyCacheHeaders(w http.ResponseWriter, path string) {
	switch {
	case strings.HasPrefix(path, "/assets/"):
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	case path == "/sw.js":
		w.Header().Set("Cache-Control", "no-cache")
	case path == "/manifest.webmanifest" || path == "/index.html" || path == "/":
		w.Header().Set("Cache-Control", "no-cache")
	default:
		w.Header().Set("Cache-Control", "public, max-age=86400")
	}
}
