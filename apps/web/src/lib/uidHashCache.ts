/** 同步可读的 uid_hash 缓存，供 axios 拦截器注入 X-Uid-Hash（避免 client ↔ platformUser 循环依赖） */

const HASH_KEY = 'nestedu_uid_hash_v1'
const TOKEN_TAIL_KEY = 'nestedu_uid_hash_token_v1'

function readSession(key: string): string {
  if (typeof sessionStorage === 'undefined') return ''
  try {
    return (sessionStorage.getItem(key) || '').trim()
  } catch {
    return ''
  }
}

function writeSession(key: string, value: string) {
  if (typeof sessionStorage === 'undefined') return
  try {
    if (value) sessionStorage.setItem(key, value)
    else sessionStorage.removeItem(key)
  } catch {
    // private mode / blocked storage
  }
}

function tokenTail(token: string): string {
  return (token || '').trim().slice(-24)
}

let cachedUidHash = ''
let cachedTokenTail = ''

function loadFromSession() {
  cachedUidHash = readSession(HASH_KEY)
  cachedTokenTail = readSession(TOKEN_TAIL_KEY)
}

loadFromSession()

function pickFromRecord(item: Record<string, unknown> | null, keys: string[]): string {
  if (!item) return ''
  for (const key of keys) {
    const value = item[key]
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim()
    }
  }
  return ''
}

/** 从 auth-bridge 登录态提取 uid_hash（字段名因 iframe / 顶层登录而不稳定） */
export function pickUidHashFromAuth(authInfo: unknown): string {
  if (!authInfo || typeof authInfo !== 'object') return ''
  const info = authInfo as Record<string, unknown>
  const direct = pickFromRecord(info, ['uidHash', 'uid_hash', 'uid'])
  if (direct) return direct
  const user = info.user && typeof info.user === 'object' ? (info.user as Record<string, unknown>) : null
  return pickFromRecord(user, ['uid_hash', 'uidHash', 'uid', 'id'])
}

export function getCachedUidHash(token?: string): string {
  if (!cachedUidHash) loadFromSession()
  if (token) {
    const tail = tokenTail(token)
    if (!tail || cachedTokenTail !== tail) return ''
  }
  return cachedUidHash
}

export function setCachedUidHash(uidHash: string, token?: string) {
  cachedUidHash = (uidHash || '').trim()
  if (token) cachedTokenTail = tokenTail(token)
  writeSession(HASH_KEY, cachedUidHash)
  writeSession(TOKEN_TAIL_KEY, cachedTokenTail)
}

export function hydrateUidHashFromAuth(authInfo: unknown, token = ''): string {
  const fromAuth = pickUidHashFromAuth(authInfo)
  const authToken =
    token ||
    (authInfo && typeof authInfo === 'object' && typeof (authInfo as { token?: unknown }).token === 'string'
      ? String((authInfo as { token: string }).token)
      : '')
  if (fromAuth) {
    setCachedUidHash(fromAuth, authToken)
    return fromAuth
  }
  return getCachedUidHash(authToken)
}

export function clearCachedUidHash() {
  cachedUidHash = ''
  cachedTokenTail = ''
  writeSession(HASH_KEY, '')
  writeSession(TOKEN_TAIL_KEY, '')
}

export function isMissingUidHashError(err: unknown): boolean {
  const chunks: string[] = []
  if (typeof err === 'string') chunks.push(err)
  if (err instanceof Error) chunks.push(err.message)
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: unknown } }).response?.data
    chunks.push(JSON.stringify(data ?? ''))
  }
  return chunks.some((text) => /X-Uid-Hash|缺少用户标识/.test(text))
}
