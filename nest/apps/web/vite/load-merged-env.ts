import path from "path";
import { fileURLToPath } from "url";
import { loadEnv, type Plugin } from "vite";

const viteDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(viteDir, "..");
const repoRoot = path.resolve(webDir, "../..");

export function loadMergedEnv(mode: string, prefix = ""): Record<string, string> {
  return {
    ...loadEnv(mode, repoRoot, prefix),
    ...loadEnv(mode, webDir, prefix),
  };
}

export function mergedEnvPlugin(): Plugin {
  return {
    name: "merged-env",
    config(_, { mode }) {
      const env = loadMergedEnv(mode, "");
      const define = Object.fromEntries(
        Object.entries(env)
          .filter(([key]) => key.startsWith("VITE_"))
          .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
      );

      return { define };
    },
  };
}

export function resolveViteBase(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  let base = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (!base.endsWith("/")) {
    base += "/";
  }
  return base;
}

export function resolveRouterBasename(raw: string | undefined): string | undefined {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed === "/") {
    return undefined;
  }

  const base = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return base.replace(/\/$/, "");
}
