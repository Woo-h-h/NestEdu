# Components 组件库

包含 PageLazy 和 Loading 组件，用于简化路由配置中的懒加载实现。

## 组件列表

### PageLazy 组件
一个封装了 Suspense 和错误边界的懒加载页面组件。

### Loading 组件
可复用的加载状态组件，支持多种样式和大小。

## 特性

- 🚀 **简单懒加载**：直接使用动态导入函数 `() => import('@/pages/xxx')`
- 🔄 自动处理 Suspense 包装
- 🛡️ 内置错误边界处理
- 🎨 可自定义加载组件
- 📱 响应式设计
- 🔧 TypeScript 支持
- 📁 组件独立目录结构

## 基本使用

### PageLazy 组件使用

```tsx
import React from 'react';
import { PageLazy } from '@/packages/components';

// 使用动态导入函数
const routes = [
  {
    path: "/",
    element: <PageLazy component={() => import('@/pages/Home')} />,
  },
  {
    path: "/about",
    element: <PageLazy component={() => import('@/pages/About')} />,
  },
];
```

### Loading 组件使用

基于Semi UI的Spin组件实现，提供灵活的加载状态显示。

```tsx
import React from 'react';
import { Loading } from '@/packages/components';

// 基本使用
<Loading />

// 自定义文本和大小
<Loading text="正在加载数据..." size="large" />

// 自定义样式
<Loading 
  className="min-h-[300px] bg-gray-50 rounded-lg" 
  text="处理中..." 
  size="small"
/>

// 不显示加载动画
<Loading text="请稍候" showSpinner={false} />

// 控制加载状态
<Loading 
  text="数据加载中..." 
  spinning={isLoading}
/>
```

## 高级用法

### 自定义加载文本

```tsx
<PageLazy 
  component={HomePage} 
  fallbackProps={{ text: "正在加载首页..." }}
/>
```

### 自定义加载组件样式

```tsx
<PageLazy 
  component={HomePage} 
  fallbackProps={{ 
    className: "flex items-center justify-center min-h-[400px] bg-gray-50",
    text: "页面加载中，请稍候..."
  }}
/>
```

### 使用自定义加载组件

```tsx
// 使用自定义加载组件
import { Spin } from '@douyinfe/semi-ui';
import { Loading } from '@/packages/components';

const CustomLoadingComponent = ({ text = "加载中..." }) => (
  <div className="flex flex-col items-center justify-center min-h-screen">
    <Spin size="large" />
    <div className="mt-4 text-gray-600">{text}</div>
  </div>
);

<PageLazy 
  component={HomePage} 
  fallback={CustomLoadingComponent}
  fallbackProps={{ text: "正在加载数据..." }}
/>

// 或者直接使用Loading组件的不同配置
<PageLazy 
  component={HomePage}
  fallbackProps={{ 
    size: "large",
    text: "正在加载数据...",
    className: "min-h-[500px] bg-blue-50"
  }}
/>
```

### 使用自定义错误边界

```tsx
const CustomErrorBoundary = ({ children }) => {
  // 自定义错误边界实现
  return children;
};

<PageLazy 
  component={HomePage} 
  errorBoundary={CustomErrorBoundary}
/>
```

## API 参考

### PageLazy Props

| 属性 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| component | () => Promise<{default: ComponentType}> | ✅ | - | 动态导入函数，返回组件的 Promise |
| fallback | React.ComponentType | ❌ | Loading | 自定义加载组件 |
| fallbackProps | LoadingProps | ❌ | {} | 传递给加载组件的 props |
| errorBoundary | React.ComponentType | ❌ | DefaultErrorBoundary | 自定义错误边界组件 |

### Loading Props

| 属性 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| className | string | ❌ | "flex items-center justify-center min-h-screen" | 容器样式类名 |
| text | string | ❌ | "加载中..." | 加载提示文本 |
| size | 'small' \| 'medium' \| 'large' | ❌ | 'medium' | 加载组件大小 |
| showSpinner | boolean | ❌ | true | 是否显示加载动画 |
| spinning | boolean | ❌ | true | 控制加载状态，基于Semi UI Spin组件 |

## 在路由中的完整示例

```tsx
// routes/index.tsx
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PageLazy } from '@/packages/components';

const Routes = () => {
  return [
    {
      path: "/",
      // 直接使用动态导入函数，PageLazy自动处理懒加载
      element: <PageLazy component={() => import('@/pages/Home')} />,
    },
    {
      path: "/about",
      element: (
        <PageLazy 
          component={() => import('@/pages/About')} 
          fallbackProps={{ text: "正在加载关于页面..." }}
        />
      ),
    },
    {
      path: "/contact",
      element: (
        <PageLazy 
          component={() => import('@/pages/Contact')}
          fallbackProps={{ 
            className: "flex items-center justify-center min-h-[500px]",
            text: "联系页面加载中..."
          }}
        />
      ),
    },
  ];
};

const router = createBrowserRouter(Routes());

export default function RouterConfig() {
  return <RouterProvider router={router} />;
}
```

## 注意事项

1. **简单懒加载**: `component` 属性只支持动态导入函数：
   - 动态导入函数：`() => import('@/pages/Home')`
2. **错误处理**: 内置的错误边界会捕获组件加载和渲染错误，提供重新加载功能
3. **性能优化**: 组件会自动处理代码分割，提升应用加载性能
4. **样式一致性**: 默认使用 Tailwind CSS 类名，确保与项目样式保持一致
5. **用法**: 直接使用动态导入函数，无需手动调用 `React.lazy()`