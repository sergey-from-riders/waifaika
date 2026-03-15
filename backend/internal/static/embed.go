package static

import (
	"embed"
	"io/fs"
)

//go:embed webdist
var embeddedDist embed.FS

func embeddedFS() (fs.FS, error) {
	return fs.Sub(embeddedDist, "webdist")
}
