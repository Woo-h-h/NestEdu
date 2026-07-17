export function normalizeBasePath(raw: string | undefined): string {
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

export function routerBasenameFromBasePath(basePath: string): string | undefined {
  if (basePath === "/") {
    return undefined;
  }
  return basePath.replace(/\/$/, "");
}

export const appBasePath = normalizeBasePath(import.meta.env.VITE_BASE_PATH);
export const appRouterBasename = routerBasenameFromBasePath(appBasePath);
