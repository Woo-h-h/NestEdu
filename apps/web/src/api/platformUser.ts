import { request } from '@/api/client'
import { authBridge } from '@/lib/authBridge'
import { clearLegacyAuthStorage } from '@/lib/authIdentity'
import { clearCachedUidHash, getCachedUidHash, hydrateUidHashFromAuth, setCachedUidHash } from '@/lib/uidHashCache'

export interface PlatformUserSelf {
  raw: Record<string, unknown>
  phone: string
  username: string
  nickname: string
  realName: string
  uidHash: string
  role: string
}

interface ApiEnvelope {
  success?: boolean
  result?: unknown
  errorMessage?: string
  error_message?: string
}

function pickString(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function asMobilePhone(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (/^1\d{10}$/.test(raw)) return raw
  const digits = raw.replace(/\D/g, '')
  if (/^1\d{10}$/.test(digits)) return digits
  return ''
}

/**
 * 从鉴权上下文推断手机号（sub / bid / user 字段）。
 * 用于和 /user/self 交叉校验，避免 Cookie 旧会话串号。
 */
export function resolvePhoneFromAuthInfo(
  auth: ReturnType<typeof authBridge.getAuthInfo> | null | undefined
): string {
  if (!auth) return ''
  const direct = asMobilePhone(auth.sub) || asMobilePhone(auth.bid)
  if (direct) return direct

  const user =
    auth.user && typeof auth.user === 'object'
      ? (auth.user as Record<string, unknown>)
      : null
  if (!user) return ''
  return (
    asMobilePhone(user.phone) ||
    asMobilePhone(user.mobile) ||
    asMobilePhone(user.mobile_phone) ||
    asMobilePhone(user.username) ||
    asMobilePhone(user.userName) ||
    asMobilePhone(user.user_name) ||
    asMobilePhone(user.login_name) ||
    asMobilePhone(user.account) ||
    ''
  )
}

/**
 * 拉取平台当前登录用户资料（AI101 `/api/user/self`）。
 * 本地需 Vite 代理 `/api/user`；生产需同域反代。
 */
export async function fetchPlatformUserSelf(): Promise<PlatformUserSelf | null> {
  const auth = authBridge.getAuthInfo()
  if (!auth?.token) return null

  // 关闭 Cookie：同域 iframe 下旧登录 Cookie 可能覆盖 Bearer，导致串号到上一账号
  const envelope = await request.get<ApiEnvelope>('/api/user/self', {
    withCredentials: false,
  })
  if (envelope?.success === false) {
    const msg = (envelope.errorMessage || envelope.error_message || '').trim()
    throw new Error(msg || '获取用户资料失败')
  }

  const raw =
    envelope?.result && typeof envelope.result === 'object'
      ? (envelope.result as Record<string, unknown>)
      : envelope && typeof envelope === 'object'
        ? (envelope as unknown as Record<string, unknown>)
        : {}

  const nested =
    (raw.user && typeof raw.user === 'object' && (raw.user as Record<string, unknown>)) ||
    (raw.data && typeof raw.data === 'object' && (raw.data as Record<string, unknown>)) ||
    raw

  const user: PlatformUserSelf = {
    raw: nested,
    phone: pickString(nested, [
      'phone',
      'mobile',
      'mobile_phone',
      'mobilePhone',
      'tel',
      'cellphone',
    ]),
    username: pickString(nested, ['username', 'user_name', 'userName', 'login_name', 'account']),
    nickname: pickString(nested, [
      'nickname',
      'nick_name',
      'nickName',
      'display_name',
      'displayName',
    ]),
    realName: pickString(nested, ['real_name', 'realName', 'true_name', 'trueName', 'name']),
    uidHash: pickString(nested, ['uid_hash', 'uidHash', 'uid', 'id']),
    role: pickString(nested, ['role']),
  }
  if (user.uidHash) setCachedUidHash(user.uidHash, auth.token)
  return user
}

/** 优先手机号；平台「用户名」常即手机号 */
export function resolvePhoneFromUserSelf(user: PlatformUserSelf | null | undefined): string {
  if (!user) return ''
  const fromPhone = asMobilePhone(user.phone)
  if (fromPhone) return fromPhone
  return asMobilePhone(user.username)
}

const SELF_CACHE_TTL_MS = 60_000

let cachedSelf: { value: PlatformUserSelf | null; at: number; token: string } | null = null
let inflightSelf: Promise<PlatformUserSelf | null> | null = null

function currentAuthToken(): string {
  return (authBridge.getAuthInfo()?.token || '').trim()
}

/** 清除用户资料缓存（登出或切换账号时调用）。uid_hash 单独处理，避免并发 BFF 请求被清空头。 */
export function clearTeacherPhoneCache() {
  cachedSelf = null
  inflightSelf = null
}

/** 最近一次 /user/self 拿到的 uid_hash（可能为空） */
export { getCachedUidHash } from '@/lib/uidHashCache'

/** 确保即将发起的 BFF 请求带上 X-Uid-Hash（iframe 登录态有时不含该字段）。 */
export async function ensureUidHashForBff(force = false): Promise<string> {
  const auth = authBridge.getAuthInfo()
  if (!auth?.token) {
    clearCachedUidHash()
    return ''
  }
  const ready = hydrateUidHashFromAuth(auth, auth.token)
  if (ready && !force) return ready
  const user = await getCachedPlatformUserSelf(force)
  const hash = (user?.uidHash || getCachedUidHash(auth.token)).trim()
  if (hash) setCachedUidHash(hash, auth.token)
  return hash
}

async function getCachedPlatformUserSelf(force = false): Promise<PlatformUserSelf | null> {
  const token = currentAuthToken()
  if (!token) {
    clearTeacherPhoneCache()
    clearCachedUidHash()
    return null
  }

  if (force) clearTeacherPhoneCache()

  const now = Date.now()
  if (
    !force &&
    cachedSelf &&
    cachedSelf.token === token &&
    now - cachedSelf.at < SELF_CACHE_TTL_MS
  ) {
    return cachedSelf.value
  }
  if (cachedSelf && cachedSelf.token !== token) {
    clearTeacherPhoneCache()
  }
  if (inflightSelf) return inflightSelf

  inflightSelf = (async () => {
    try {
      const tokenAtStart = currentAuthToken()
      if (!tokenAtStart) return null
      const user = await fetchPlatformUserSelf()
      if (currentAuthToken() !== tokenAtStart) return null
      cachedSelf = { value: user, at: Date.now(), token: tokenAtStart }
      if (user?.uidHash) setCachedUidHash(user.uidHash, tokenAtStart)
      return user
    } finally {
      inflightSelf = null
    }
  })()

  return inflightSelf
}

/**
 * 向父页强制拉取最新登录态，并清空用户缓存。
 * 用于换账号后仍串到旧手机号的场景。
 */
export async function refreshTeacherAuthIdentity(): Promise<void> {
  clearLegacyAuthStorage()
  try {
    if (typeof window !== 'undefined' && window.parent !== window) {
      await authBridge.requestAuthInfo({ force: true })
    }
  } catch (err) {
    console.warn('[NestAuth] requestAuthInfo failed', err)
  }
  clearTeacherPhoneCache()
}

/**
 * 当前登录教师手机号（成果库个人文件夹名）。
 * 与鉴权上下文交叉校验，降低 Cookie/缓存串号风险。
 */
export async function getCurrentTeacherPhone(options?: {
  force?: boolean
}): Promise<string> {
  if (options?.force) {
    clearTeacherPhoneCache()
  }

  const authPhone = resolvePhoneFromAuthInfo(authBridge.getAuthInfo())
  const user = await getCachedPlatformUserSelf(Boolean(options?.force))
  const selfPhone = resolvePhoneFromUserSelf(user)

  if (authPhone && selfPhone && authPhone !== selfPhone) {
    console.warn('[NestUser] phone mismatch between auth and /user/self', {
      authPhone,
      selfPhone,
    })
    clearTeacherPhoneCache()
  }

  // 父页下发的 sub/bid 是登录真相源，优先于可能被旧 token 污染的 /user/self
  return authPhone || selfPhone || ''
}

/** 平台展示名：真实姓名优先，其次昵称 */
export async function getCurrentTeacherDisplayName(): Promise<string> {
  const user = await getCachedPlatformUserSelf()
  if (!user) return ''
  if (user.realName.trim()) return user.realName.trim()
  if (user.nickname.trim()) return user.nickname.trim()
  return ''
}
