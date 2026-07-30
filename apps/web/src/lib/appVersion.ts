/** 前端构建版本：用于侧栏展示，确认每次部署是否为最新包 */

function readEnv(key: keyof ImportMetaEnv | string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** 语义版本（可人工覆盖 VITE_APP_VERSION） */
export const APP_VERSION = readEnv('VITE_APP_VERSION') || '0.1.0'

/**
 * 构建号：每次 vite build 自动生成（UTC 时间戳），
 * 也可用 VITE_APP_BUILD_ID 在 CI/Docker 中注入。
 */
export const APP_BUILD_ID = readEnv('VITE_APP_BUILD_ID') || 'dev'

/** 侧栏展示用，例如：v0.1.0 · 20260730-0927 */
export function formatAppVersionLabel(options?: { compact?: boolean }): string {
  const compact = options?.compact === true
  if (compact) {
    return APP_BUILD_ID === 'dev' ? `v${APP_VERSION}` : APP_BUILD_ID
  }
  if (APP_BUILD_ID === 'dev') {
    return `v${APP_VERSION} · dev`
  }
  return `v${APP_VERSION} · ${APP_BUILD_ID}`
}
