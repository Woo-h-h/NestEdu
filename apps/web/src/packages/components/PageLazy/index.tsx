import React, { Suspense } from 'react';
import Loading, { LoadingProps } from '../Loading';


// PageLazy组件的Props类型
interface PageLazyProps {
  // 已在模块顶层通过 React.lazy 创建的组件
  component: React.ComponentType;
  // 自定义加载组件
  fallback?: React.ComponentType<LoadingProps>;
  // 加载组件的props
  fallbackProps?: LoadingProps;
  // 错误边界 - 支持类组件和函数组件
  errorBoundary?: React.ComponentType<{ children: React.ReactNode }> | React.ComponentClass<{ children: React.ReactNode }>;
}

// React官方推荐的错误边界类组件实现
class DefaultErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // 捕获渲染期间的错误
  static getDerivedStateFromError(error: Error) {
    // 更新state以显示错误UI
    return { hasError: true, error };
  }

  // 记录错误信息
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PageLazy Error Boundary caught an error:', error, errorInfo);
  }

  // 重置错误状态的方法
  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-500 text-lg mb-4">页面加载失败</div>
            <div className="text-gray-600 text-sm mb-6">
              {this.state.error?.message || '组件渲染时发生未知错误'}
            </div>
            <div className="space-x-4">
              <button
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                onClick={this.resetError}
              >
                重试
              </button>
              <button
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                onClick={() => window.location.reload()}
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const PageLazy: React.FC<PageLazyProps> = ({
  component,
  fallback: FallbackComponent = Loading,
  fallbackProps = {},
  errorBoundary: ErrorBoundary = DefaultErrorBoundary
}) => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<FallbackComponent {...fallbackProps} />}>
        {React.createElement(component)}
      </Suspense>
    </ErrorBoundary>
  );
};

export default PageLazy;
export { DefaultErrorBoundary };
export type { PageLazyProps };
