import { lazy } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { appRouterBasename } from '@/lib/base-path'
import { PageLazy } from '@/packages/components'
import AppLayout from '@/components/layout/AppLayout'

const DashboardPage = lazy(() => import('@/pages/dashboard/index'))
const ResourcesPage = lazy(() => import('@/pages/resources/index'))
const WeeklyPlanCreatePage = lazy(() => import('@/pages/weekly-plan/create/index'))
const WeeklyPlanHistoryPage = lazy(() => import('@/pages/weekly-plan/history/index'))
const NotFoundPage = lazy(() => import('@/packages/components/NotFound/index'))

const routes = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <PageLazy component={DashboardPage} />,
      },
      {
        path: 'resources',
        element: <PageLazy component={ResourcesPage} />,
      },
      {
        path: 'weekly-plan',
        element: <Navigate to="/weekly-plan/create" replace />,
      },
      {
        path: 'weekly-plan/create',
        element: <PageLazy component={WeeklyPlanCreatePage} />,
      },
      {
        path: 'weekly-plan/history',
        element: <PageLazy component={WeeklyPlanHistoryPage} />,
      },
    ],
  },
  {
    path: '*',
    element: (
      <PageLazy
        component={NotFoundPage}
        fallbackProps={{ tip: '正在加载页面...' }}
      />
    ),
  },
]

const router = createBrowserRouter(routes, {
  basename: appRouterBasename,
})

export default function RouterConfig() {
  return <RouterProvider router={router} />
}
