package static

import (
	"errors"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

var allowedLegalDocs = map[string]struct{}{
	"privacy.txt":                     {},
	"consent-personal-data-email.txt": {},
}

func NewLegalDocs(dir string) (http.Handler, error) {
	if strings.TrimSpace(dir) == "" {
		return nil, nil
	}

	cleanDir := filepath.Clean(dir)
	info, err := os.Stat(cleanDir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, nil
		}
		return nil, err
	}
	if !info.IsDir() {
		return nil, nil
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		docName := path.Base(path.Clean("/" + r.URL.Path))
		if _, ok := allowedLegalDocs[docName]; !ok {
			http.NotFound(w, r)
			return
		}

		docPath := filepath.Join(cleanDir, docName)
		info, err := os.Stat(docPath)
		if err != nil || info.IsDir() {
			http.NotFound(w, r)
			return
		}

		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		http.ServeFile(w, r, docPath)
	}), nil
}
