/** 同步可读的 uid_hash 缓存，供 axios 拦截器注入 X-Uid-Hash（避免 client ↔ platformUser 循环依赖） */

let cachedUidHash = ''

export function getCachedUidHash(): string {
  return cachedUidHash
}

export function setCachedUidHash(uidHash: string) {
  cachedUidHash = (uidHash || '').trim()
}

export function clearCachedUidHash() {
  cachedUidHash = ''
}
