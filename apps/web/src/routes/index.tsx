import { lazy } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { appRouterBasename } from '@/lib/base-path'
import { PageLazy } from '@/packages/components'
import AppLayout from '@/components/layout/AppLayout'

const DashboardPage = lazy(() => import('@/pages/dashboard/index'))
const ResourcesPage = lazy(() => import('@/pages/resources/index'))
const WeeklyPlanPage = lazy(() => import('@/pages/weekly-plan/index'))
const ArchivePage = lazy(() => import('@/pages/archive/index'))
const ArchiveUploadPage = lazy(() => import('@/pages/archive/upload'))
const ProfilePage = lazy(() => import('@/pages/profile/index'))
const HelpPage = lazy(() => import('@/pages/help/index'))
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
        path: 'activity',
        element: <PageLazy component={ResourcesPage} />,
      },
      {
        path: 'resources',
        element: <Navigate to="/activity" replace />,
      },
      {
        path: 'weekly-plan',
        element: <PageLazy component={WeeklyPlanPage} />,
      },
      {
        path: 'weekly-plan/create',
        element: <Navigate to="/weekly-plan" replace />,
      },
      {
        path: 'weekly-plan/manage',
        element: <Navigate to="/weekly-plan" replace />,
      },
      {
        path: 'weekly-plan/history',
        element: <Navigate to="/weekly-plan" replace />,
      },
      {
        path: 'archive',
        element: <PageLazy component={ArchivePage} />,
      },
      {
        path: 'archive/upload',
        element: <PageLazy component={ArchiveUploadPage} />,
      },
      {
        path: 'profile',
        element: <PageLazy component={ProfilePage} />,
      },
      {
        path: 'help',
        element: <PageLazy component={HelpPage} />,
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
