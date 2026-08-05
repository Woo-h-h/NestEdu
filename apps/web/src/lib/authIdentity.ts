import type { AuthInfo } from '@zcat-open/auth-bridge'

/** auth-bridge 默认 localStorage 键（历史版本可能写入，导致换账号后仍读旧 token） */
const LEGACY_AUTH_KEYS = ['token', 'bid', 'sub', 'tempAuthInfo'] as const

/** 启动时清除浏览器里残留的旧登录态，避免覆盖父页新下发的 token */
export function clearLegacyAuthStorage() {
  if (typeof window === 'undefined') return
  try {
    for (const key of LEGACY_AUTH_KEYS) {
      window.localStorage.removeItem(key)
    }
  } catch {
    // private mode / blocked storage
  }
}

/** 用于检测换账号：token / sub / bid 任一变化即视为新用户 */
export function getAuthIdentityKey(auth: AuthInfo | null | undefined): string {
  if (!auth?.token) return ''
  const sub = String(auth.sub ?? '').trim()
  const bid = String(auth.bid ?? '').trim()
  const tokenTail = auth.token.slice(-16)
  return `${sub}|${bid}|${tokenTail}`
}
