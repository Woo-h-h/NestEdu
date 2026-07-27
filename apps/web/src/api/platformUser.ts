import { request } from '@/api/client'
import { authBridge } from '@/lib/authBridge'

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

/**
 * 拉取平台当前登录用户资料（AI101 `/api/user/self`）。
 * 本地需 Vite 代理 `/api/user`；生产需同域反代。
 */
export async function fetchPlatformUserSelf(): Promise<PlatformUserSelf | null> {
  const auth = authBridge.getAuthInfo()
  if (!auth?.token) return null

  const envelope = await request.get<ApiEnvelope>('/api/user/self')
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

  // 兼容 result 再包一层 user / data
  const nested =
    (raw.user && typeof raw.user === 'object' && (raw.user as Record<string, unknown>)) ||
    (raw.data && typeof raw.data === 'object' && (raw.data as Record<string, unknown>)) ||
    raw

  return {
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
}

/** 优先手机号；平台「用户名」常即手机号 */
export function resolvePhoneFromUserSelf(user: PlatformUserSelf | null | undefined): string {
  if (!user) return ''
  if (user.phone) return user.phone
  // 用户名若为 11 位数字，按手机号使用
  if (/^1\d{10}$/.test(user.username)) return user.username
  return ''
}

const SELF_CACHE_TTL_MS = 60_000

let cachedSelf: { value: PlatformUserSelf | null; at: number } | null = null
let inflightSelf: Promise<PlatformUserSelf | null> | null = null

/** 清除用户资料缓存（登出或切换账号时调用） */
export function clearTeacherPhoneCache() {
  cachedSelf = null
  inflightSelf = null
}

async function getCachedPlatformUserSelf(): Promise<PlatformUserSelf | null> {
  const now = Date.now()
  if (cachedSelf && now - cachedSelf.at < SELF_CACHE_TTL_MS) {
    return cachedSelf.value
  }
  if (inflightSelf) return inflightSelf

  inflightSelf = (async () => {
    try {
      const user = await fetchPlatformUserSelf()
      cachedSelf = { value: user, at: Date.now() }
      return user
    } finally {
      inflightSelf = null
    }
  })()

  return inflightSelf
}

/**
 * 当前登录教师手机号（成果库个人文件夹名）。
 * 短时内存缓存，避免成果库与画像同时请求反复打 /user/self。
 */
export async function getCurrentTeacherPhone(): Promise<string> {
  const user = await getCachedPlatformUserSelf()
  return resolvePhoneFromUserSelf(user)
}

/** 平台展示名：真实姓名优先，其次昵称 */
export async function getCurrentTeacherDisplayName(): Promise<string> {
  const user = await getCachedPlatformUserSelf()
  if (!user) return ''
  if (user.realName.trim()) return user.realName.trim()
  if (user.nickname.trim()) return user.nickname.trim()
  return ''
}
