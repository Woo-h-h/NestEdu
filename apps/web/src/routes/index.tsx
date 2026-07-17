import { lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { appRouterBasename } from "@/lib/base-path";
import { PageLazy } from "@/packages/components";

const HomePage = lazy(() => import("@/pages/home/index"));
const NotFoundPage = lazy(() => import("@/packages/components/NotFound/index"));

const routes = [
  {
    path: "/",
    element: <PageLazy component={HomePage} />,
  },
  {
    path: "*",
    element: (
      <PageLazy
        component={NotFoundPage}
        fallbackProps={{ tip: "正在加载页面..." }}
      />
    ),
  },
];

const router = createBrowserRouter(routes, {
  basename: appRouterBasename,
});

export default function RouterConfig() {
  return <RouterProvider router={router} />;
}
