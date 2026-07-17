import {
  AUTH_BRIDGE_NAMESPACE,
  AI101_DEFAULT_TICKET_EXCHANGE_PATH,
  createAi101SubmoduleAuth,
  createBridgeMessage,
  isOriginAllowed,
  normalizeAllowedOrigins,
  resolveAi101LoginUrl,
  type Ai101FetchLike,
} from "@zcat-open/auth-bridge";

import type { IFrameMessage } from "@/packages/utils/communication/type";

const DEFAULT_PARENT_ORIGINS = [
  "https://www.zcat.cn",
  "https://www.kjxhai.cn",
  "https://t.aix101.com",
  "http://localhost:3000",
];

const resolveParentOrigins = (): string[] => {
  const envOrigins = import.meta.env.VITE_AI101_PARENT_ORIGINS;
  if (!envOrigins) {
    return DEFAULT_PARENT_ORIGINS;
  }

  const origins = envOrigins
    .split(",")
    .map((origin: string) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : DEFAULT_PARENT_ORIGINS;
};

export const parentOrigins = normalizeAllowedOrigins(resolveParentOrigins());

const resolveDirectAuthEnabled = (): boolean => {
  const rawValue = import.meta.env.VITE_AI101_DIRECT_AUTH;
  if (rawValue === "true") {
    return true;
  }
  if (rawValue === "false") {
    return false;
  }
  // 登录回跳 URL 带 ticket 时，本地开发也要执行换票，否则回跳后仍显示未登录。
  if (typeof window !== "undefined" && hasTicketInUrl()) {
    return true;
  }
  return import.meta.env.PROD;
};

const hasTicketInUrl = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const params = new URL(window.location.href).searchParams;
    return resolveTicketParams().some((param) => Boolean(params.get(param)));
  } catch {
    return false;
  }
};

const resolveTicketParams = (): string[] => {
  const envTicketParam = import.meta.env.VITE_AI101_TICKET_PARAM;
  if (envTicketParam) {
    return envTicketParam
      .split(",")
      .map((param: string) => param.trim())
      .filter(Boolean);
  }

  return ["ticket"];
};

// VITE_AI101_API_BASE_URL 是构建时注入的 AI101 统一登录换票 API 来源，不复用业务 API 配置。
const resolveTicketExchangeApiBaseUrl = (): string | undefined => {
  const ai101ApiBaseUrl = (import.meta.env.VITE_AI101_API_BASE_URL || "").trim();
  return ai101ApiBaseUrl || undefined;
};

const createTicketExchangeFetcher = (): Ai101FetchLike | undefined => {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return undefined;
  }

  return async (input, init) => {
    let requestUrl = input;
    try {
      const parsed = new URL(input, window.location.origin);
      if (parsed.pathname.endsWith(AI101_DEFAULT_TICKET_EXCHANGE_PATH)) {
        // 本地开发走同源相对路径，由 Vite proxy 转发到 AI101 API，避免浏览器直连 api.zcat.cn 触发 CORS。
        requestUrl = AI101_DEFAULT_TICKET_EXCHANGE_PATH;
      }
    } catch {
      // Keep the original URL when parsing fails.
    }

    return fetch(requestUrl, init);
  };
};

const ai101Auth = createAi101SubmoduleAuth({
  parentOrigins,
  clientName: import.meta.env.VITE_AI101_CLIENT_NAME || "mvp-template",
  loginOrigin: import.meta.env.VITE_AI101_LOGIN_ORIGIN || undefined,
  apiBaseUrl: resolveTicketExchangeApiBaseUrl(),
  ticketParam: resolveTicketParams(),
  directAuthEnabled: resolveDirectAuthEnabled(),
  // 兼容 auth-bridge 0.1.5：AI101 换票失败必须停在当前页，不能自动跳登录页形成循环。
  redirectOnExchangeFailure: false,
  fetcher: createTicketExchangeFetcher(),
  persistToLocalStorage: false,
});

export const authBridge = ai101Auth.authClient;

const resolveLoginUrl = (): string =>
  resolveAi101LoginUrl({
    loginOrigin: import.meta.env.VITE_AI101_LOGIN_ORIGIN || undefined,
    currentUrl: typeof window !== "undefined" ? window.location.href : undefined,
  });

export const loginWithAi101 = async (): Promise<void> => {
  if (typeof window === "undefined") {
    return;
  }

  if (window.parent !== window) {
    await authBridge.requestAuthInfo({ force: true });
    return;
  }

  const loginUrl = new URL(resolveLoginUrl(), window.location.href);
  loginUrl.searchParams.set("from", window.location.href);
  window.location.assign(loginUrl.toString());
};

let started = false;

export const startAuthBridge = async () => {
  if (started) {
    return authBridge.getAuthInfo();
  }

  const startedWithTicket = typeof window !== "undefined" && hasTicketInUrl();
  const authInfo = await ai101Auth.start();
  started = true;
  if (startedWithTicket && !authInfo?.token) {
    throw new Error("AI101 登录认证失败，请检查 login_auto 请求");
  }
  return authInfo;
};

export const stopAuthBridge = () => {
  if (!started) {
    return;
  }

  ai101Auth.stop();
  started = false;
};

export const postMessageToParent = (message: unknown) => {
  if (window.parent === window) {
    return;
  }

  parentOrigins.forEach((origin) => {
    window.parent.postMessage(message, origin);
  });
};

export const sendPageDataStatus = (hasData: boolean) => {
  postMessageToParent(createBridgeMessage("PAGE_DATA_STATUS", { hasData }));
};

export const notifyRouteChange = (path: string) => {
  authBridge.notifyRouteChange(path);
};

export const listenToParentMessages = (callback: (message: IFrameMessage) => void) => {
  const handleMessage = (event: MessageEvent) => {
    if (!isOriginAllowed(event.origin, parentOrigins)) {
      return;
    }

    if (
      event.data &&
      typeof event.data === "object" &&
      "namespace" in event.data &&
      event.data.namespace === AUTH_BRIDGE_NAMESPACE
    ) {
      return;
    }

    if (event.data && typeof event.data === "object" && "type" in event.data) {
      callback(event.data as IFrameMessage);
    }
  };

  window.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("message", handleMessage);
  };
};
