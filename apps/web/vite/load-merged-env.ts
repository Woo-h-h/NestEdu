import path from "path";
import { readFileSync } from "fs";
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

function readPackageVersion(): string {
  try {
    const raw = readFileSync(path.resolve(webDir, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return (pkg.version || "0.1.0").trim() || "0.1.0";
  } catch {
    return "0.1.0";
  }
}

/** UTC 构建戳，如 20260730-0927，便于对照每次部署 */
function createBuildId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`
  );
}

export function mergedEnvPlugin(): Plugin {
  return {
    name: "merged-env",
    config(_, { mode }) {
      const env = loadMergedEnv(mode, "");

      // 每次 build 写入版本与构建号（可被 .env / CI 覆盖）
      if (!(env.VITE_APP_VERSION || "").trim()) {
        env.VITE_APP_VERSION = readPackageVersion();
      }
      if (!(env.VITE_APP_BUILD_ID || "").trim()) {
        env.VITE_APP_BUILD_ID = mode === "production" ? createBuildId() : "dev";
      }

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
