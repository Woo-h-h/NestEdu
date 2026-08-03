/** 部署后旧 index.html 仍引用已删除的 hashed chunk 时，自动刷新一次拿到新入口。 */

const RELOAD_FLAG = 'nestedu_chunk_reload_at'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message || String(err)
  if (typeof err === 'string') return err
  return String(err ?? '')
}

export function isChunkLoadError(err: unknown): boolean {
  const msg = errorMessage(err)
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\w-]+ failed|error loading dynamically imported module/i.test(
    msg
  )
}

function reloadOnceForChunkError(reason: string) {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) || '0')
    if (Number.isFinite(last) && Date.now() - last < 15_000) {
      console.warn('[chunk-reload] skipped (recent reload)', reason)
      return
    }
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()))
  } catch {
    // sessionStorage 不可用时仍尝试刷新
  }
  console.warn('[chunk-reload] reloading after stale asset', reason)
  window.location.reload()
}

/** 在应用入口尽早安装，捕获 lazy() 分包加载失败。 */
export function installChunkLoadRecovery() {
  if (typeof window === 'undefined') return

  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadError(event.reason)) return
    event.preventDefault()
    reloadOnceForChunkError(errorMessage(event.reason))
  })

  window.addEventListener(
    'error',
    (event) => {
      const target = event.target
      if (target instanceof HTMLScriptElement && target.src.includes('/assets/')) {
        reloadOnceForChunkError(target.src)
        return
      }
      if (isChunkLoadError(event.error) || isChunkLoadError(event.message)) {
        reloadOnceForChunkError(errorMessage(event.error || event.message))
      }
    },
    true
  )
}
