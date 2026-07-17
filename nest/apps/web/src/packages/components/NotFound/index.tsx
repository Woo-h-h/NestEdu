import React from "react";
import { Button } from "@/components/ui/button";

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md mx-auto">
        <div className="text-8xl font-bold text-slate-300 mb-4">404</div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-1">页面未找到</h2>
        <p className="text-sm text-slate-500">请检查地址，或返回首页继续操作。</p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button onClick={() => (window.location.href = "/")}>
            返回首页
          </Button>
          <Button variant="ghost" onClick={() => window.history.back()}>
            返回上页
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
