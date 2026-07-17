import { useEffect, useState } from 'react'
import { authBridge, loginWithAi101 } from '@/lib/authBridge'
import type { AuthInfo } from '@zcat-open/auth-bridge'
import { LogIn, UserRound } from 'lucide-react'

export default function UserBadge() {
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => authBridge.getAuthInfo())
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    return authBridge.subscribe(setAuthInfo)
  }, [])

  const handleLogin = async () => {
    setLoggingIn(true)
    try {
      await loginWithAi101()
    } catch (err) {
      console.error('[Auth] 登录失败:', err)
      setLoggingIn(false)
    }
  }

  if (!authInfo?.token) {
    return (
      <button
        type="button"
        onClick={() => void handleLogin()}
        disabled={loggingIn}
        className="btn-primary ml-auto !px-3 !py-1.5 text-xs"
      >
        <LogIn size={13} />
        {loggingIn ? '跳转登录中…' : '登录平台'}
      </button>
    )
  }

  const uid =
    (authInfo as { uid_hash?: string; uid?: string } | null)?.uid_hash ||
    (authInfo as { uid?: string } | null)?.uid ||
    '用户'
  const role = authInfo.role || ''

  return (
    <span className="ml-auto inline-flex max-w-[220px] items-center gap-1.5 truncate rounded-full border border-nest-leaf/15 bg-nest-mist/80 px-3 py-1 text-xs text-nest-pine">
      <UserRound size={13} className="shrink-0 opacity-70" />
      <span className="truncate">
        {uid}
        {role ? ` · ${role}` : ''}
      </span>
    </span>
  )
}
