import { useEffect, useState } from 'react'
import { authBridge, loginWithAi101 } from '@/lib/authBridge'
import type { AuthInfo } from '@zcat-open/auth-bridge'

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
        className="ml-auto text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 disabled:opacity-50"
      >
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
    <span className="ml-auto text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
      {uid}
      {role ? ` · ${role}` : ''}
    </span>
  )
}
