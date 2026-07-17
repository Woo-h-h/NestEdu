package config

import "strings"

// NormalizeWebBasePath returns a URL path prefix without trailing slash.
// Empty input means the app is served from the domain root.
func NormalizeWebBasePath(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" || trimmed == "/" {
		return ""
	}

	path := trimmed
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return strings.TrimRight(path, "/")
}
