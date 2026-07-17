import React from 'react';
import { Loader2 } from 'lucide-react';

// Loading组件的Props类型
interface LoadingProps {
  className?: string;
  size?: 'small' | 'middle' | 'large';
  spinning?: boolean;
  tip?: string;
}

const Loading: React.FC<LoadingProps> = ({
  className = "",
  size = "middle",
  spinning = true,
  tip = "加载中..."
}) => {
  if (!spinning) return null;

  const sizeClasses = {
    small: 'h-4 w-4',
    middle: 'h-6 w-6',
    large: 'h-8 w-8',
  };

  return (
    <div className={`${className} flex flex-col items-center justify-center gap-2 w-full`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-slate-500`} />
      {tip && <span className="text-sm text-slate-500">{tip}</span>}
    </div>
  );
};

export default Loading;
export type { LoadingProps };