package config

import (
	"bufio"
	"os"
	"strings"
)

// LoadEnvFiles loads KEY=VALUE lines from env files in order.
// Later files override earlier ones. Keys already set in the process
// environment before the first file is read are never overridden.
// Section headers like [app] are ignored.
func LoadEnvFiles(paths ...string) {
	protected := snapshotOSEnvKeys()
	for _, p := range paths {
		loadOneEnvFile(p, protected)
	}
}

func snapshotOSEnvKeys() map[string]struct{} {
	keys := make(map[string]struct{})
	for _, entry := range os.Environ() {
		idx := strings.Index(entry, "=")
		if idx <= 0 {
			continue
		}
		keys[entry[:idx]] = struct{}{}
	}
	return keys
}

func loadOneEnvFile(path string, protected map[string]struct{}) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "#") || strings.HasPrefix(line, ";") {
			continue
		}
		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			continue
		}

		idx := strings.Index(line, "=")
		if idx <= 0 {
			continue
		}

		key := strings.TrimSpace(line[:idx])
		val := strings.TrimSpace(line[idx+1:])
		if key == "" {
			continue
		}

		if len(val) >= 2 {
			if (strings.HasPrefix(val, "\"") && strings.HasSuffix(val, "\"")) ||
				(strings.HasPrefix(val, "'") && strings.HasSuffix(val, "'")) {
				val = val[1 : len(val)-1]
			}
		}

		if _, ok := protected[key]; ok {
			continue
		}
		_ = os.Setenv(key, val)
	}
}
