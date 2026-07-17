import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Plus,
  FolderOpen,
  BookOpen,
  Home,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react'
import UserBadge from '@/components/layout/UserBadge'

type MenuChild = { path: string; title: string; icon: typeof Plus }
type MenuItem =
  | { path: string; title: string; icon: typeof Home }
  | { title: string; icon: typeof BookOpen; children: MenuChild[] }

const menuItems: MenuItem[] = [
  { path: '/', title: '首页', icon: Home },
  { path: '/resources', title: '课程资源库', icon: BookOpen },
  {
    title: '周计划生成',
    icon: CalendarDays,
    children: [
      { path: '/weekly-plan/create', title: '新建周计划', icon: Plus },
      { path: '/weekly-plan/manage', title: '周计划管理', icon: FolderOpen },
    ],
  },
]

function resolveBreadcrumbs(pathname: string): string[] {
  if (pathname === '/') return ['首页']

  for (const item of menuItems) {
    if ('path' in item && item.path === pathname) {
      return ['首页', item.title]
    }
    if ('children' in item) {
      const child = item.children.find((c) => c.path === pathname)
      if (child) return ['首页', item.title, child.title]
    }
  }
  return ['首页']
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const breadcrumbs = resolveBreadcrumbs(location.pathname)

  return (
    <div className="flex h-screen bg-gray-50">
      <aside
        className={`flex flex-col bg-slate-800 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}
      >
        <div className="px-4 py-4 border-b border-slate-700 text-center">
          <span className="text-white font-bold whitespace-nowrap text-lg">
            {collapsed ? '附幼' : '附幼智能平台'}
          </span>
        </div>

        <nav className="flex-1 py-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            if ('children' in item) {
              const isActive = item.children.some((c) => location.pathname === c.path)
              const parentPath = item.children[0]?.path
              return (
                <div key={item.title}>
                  <div
                    onClick={() => parentPath && navigate(parentPath)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors ${isActive ? 'bg-slate-700 text-blue-400' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                  >
                    <Icon size={18} />
                    {!collapsed && <span>{item.title}</span>}
                  </div>
                  {!collapsed &&
                    item.children.map((child) => {
                      const ChildIcon = child.icon
                      const childActive = location.pathname === child.path
                      return (
                        <div
                          key={child.path}
                          onClick={() => navigate(child.path)}
                          className={`flex items-center gap-3 pl-10 pr-4 py-2 text-sm cursor-pointer transition-colors ${childActive ? 'text-blue-400 bg-slate-700/50' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                        >
                          <ChildIcon size={15} />
                          <span>{child.title}</span>
                        </div>
                      )
                    })}
                </div>
              )
            }

            const active = location.pathname === item.path
            return (
              <div
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  active
                    ? 'bg-slate-700 text-blue-400'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {!collapsed && <span>{item.title}</span>}
              </div>
            )
          })}
        </nav>

        <div
          onClick={() => setCollapsed(!collapsed)}
          className="flex justify-center py-3 border-t border-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center h-14 px-6 bg-white shadow-sm z-10 gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 shrink-0">
            {breadcrumbs.map((b, i) => (
              <span key={`${b}-${i}`}>
                {i > 0 && <span className="mx-1">/</span>}
                {b}
              </span>
            ))}
          </div>
          <UserBadge />
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
