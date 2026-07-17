import { useEffect, useState } from 'react'
import { authBridge } from '@/lib/authBridge'
import type { AuthInfo } from '@zcat-open/auth-bridge'

export default function UserBadge() {
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => authBridge.getAuthInfo())

  useEffect(() => {
    return authBridge.subscribe(setAuthInfo)
  }, [])

  if (!authInfo?.token) {
    return (
      <span className="ml-auto text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
        未登录
      </span>
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
