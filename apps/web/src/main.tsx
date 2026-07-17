import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { toast } from 'sonner'
import './index.css'
import App from './App.tsx'
import { getApiErrorMessage } from '@/lib/apiError'
import { startAuthBridge } from '@/lib/authBridge'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

startAuthBridge().catch((error) => {
  console.warn("Failed to initialize auth bridge", error)
  toast.error(getApiErrorMessage(error, "AI101 登录认证失败，请检查 login_auto 请求"))
  if (import.meta.env.DEV) {
    console.warn(
      "本地直访登录换票失败时，请检查 Network 中 login_auto 请求；开发环境不会自动重定向到主平台以避免循环跳转。",
    )
  }
})
