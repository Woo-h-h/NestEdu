import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import {
  loadMergedEnv,
  mergedEnvPlugin,
  resolveViteBase,
} from "./vite/load-merged-env";

export default defineConfig(({ mode }) => {
  const env = loadMergedEnv(mode, "");

  return {
    base: resolveViteBase(env.VITE_BASE_PATH),
    plugins: [mergedEnvPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    css: {
      preprocessorOptions: {
        less: {
          math: "strict",
          javascriptEnabled: true,
        },
      },
    },
    server: {
      port: 3005,
      strictPort: true,
      open: true,
      proxy: {
        // 平台知识库：前端直连 api.zcat.cn（纯前端，不经本地 Go BFF）
        "/api/knowledge": {
          target: env.VITE_PLATFORM_API_BASE_URL || env.VITE_AI101_API_BASE_URL || "https://api.zcat.cn",
          changeOrigin: true,
          secure: true,
          headers: {
            Referer: env.VITE_PLATFORM_REFERER || "https://www.zcat.cn",
          },
        },
        // 平台智能体开放 API：/v1/text/generate、/v1/chat 等
        "/v1": {
          target: env.VITE_PLATFORM_API_BASE_URL || env.VITE_AI101_API_BASE_URL || "https://api.zcat.cn",
          changeOrigin: true,
          secure: true,
          headers: {
            Referer: env.VITE_PLATFORM_REFERER || "https://www.zcat.cn",
          },
        },
        "/api/public/user/account/login_auto": {
          target: env.VITE_AI101_API_BASE_URL || "https://api.zcat.cn",
          changeOrigin: true,
          secure: true,
        },
        // 可选：若本地仍跑 Go，其它 /api/v1 可走 LOCAL_API_BASE_URL
        "/api": {
          target: env.LOCAL_API_BASE_URL || "http://127.0.0.1:8088",
          changeOrigin: true,
        },
      },
    },
  };
});
