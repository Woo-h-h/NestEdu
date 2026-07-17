import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  BookOpen,
  Home,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Leaf,
} from 'lucide-react'
import UserBadge from '@/components/layout/UserBadge'

type MenuItem = { path: string; title: string; icon: typeof Home }

const menuItems: MenuItem[] = [
  { path: '/', title: '首页', icon: Home },
  { path: '/resources', title: '课程资源库', icon: BookOpen },
  { path: '/weekly-plan', title: '周计划管理', icon: CalendarDays },
]

function resolveBreadcrumbs(pathname: string): string[] {
  if (pathname === '/') return ['首页']
  const item = menuItems.find((m) => m.path === pathname)
  if (item) return ['首页', item.title]
  if (pathname.startsWith('/weekly-plan')) return ['首页', '周计划管理']
  if (pathname.startsWith('/resources')) return ['首页', '课程资源库']
  return ['首页']
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const breadcrumbs = resolveBreadcrumbs(location.pathname)

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`relative flex flex-col text-white transition-all duration-300 ${
          collapsed ? 'w-[4.5rem]' : 'w-60'
        }`}
        style={{
          background:
            'linear-gradient(165deg, #163d32 0%, #1b4d3e 42%, #245a48 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(74,155,127,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(244,240,232,0.08), transparent 40%)',
          }}
        />

        <div className="relative z-10 border-b border-white/10 px-3 py-5">
          <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : 'px-1'}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Leaf size={18} className="text-emerald-200" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-display text-[15px] font-bold leading-tight tracking-wide">
                  华科附幼
                </div>
                <div className="truncate text-[11px] text-emerald-100/70">智能教案助手</div>
              </div>
            )}
          </div>
        </div>

        <nav className="relative z-10 flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
            return (
              <button
                type="button"
                key={item.path}
                onClick={() => navigate(item.path)}
                title={item.title}
                className={`mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  active
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-emerald-50/75 hover:bg-white/8 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="font-medium">{item.title}</span>}
              </button>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="relative z-10 flex justify-center border-t border-white/10 py-3 text-emerald-100/50 transition-colors hover:text-white"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-14 items-center gap-4 border-b border-nest-leaf/10 bg-white/70 px-6 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-1.5 text-sm text-nest-muted">
            {breadcrumbs.map((b, i) => (
              <span key={`${b}-${i}`} className="flex items-center gap-1.5 truncate">
                {i > 0 && <span className="text-nest-leaf/30">/</span>}
                <span className={i === breadcrumbs.length - 1 ? 'font-medium text-nest-ink' : ''}>
                  {b}
                </span>
              </span>
            ))}
          </div>
          <UserBadge />
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
