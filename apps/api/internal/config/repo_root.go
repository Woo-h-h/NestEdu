package config

import (
	"os"
	"path/filepath"
)

func findRepoRoot() string {
	wd, err := os.Getwd()
	if err != nil {
		return "."
	}

	dir := wd
	for {
		if fileExists(filepath.Join(dir, "pnpm-workspace.yaml")) {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	return wd
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
