import { getCachedUidHash } from "@/lib/uidHashCache";
import { authBridge } from "@/lib/authBridge";
import { buildAuthHeaders } from "@zcat-open/auth-bridge";
import axios, { AxiosHeaders, AxiosInstance, AxiosRequestConfig } from "axios";

const apiBaseURL = (import.meta.env.VITE_API_BASE_URL || "").trim();

export const settings = {
  api: apiBaseURL.replace(/\/$/, ""),
};

export interface ApiClient extends Omit<AxiosInstance, "get" | "post" | "put" | "patch" | "delete"> {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

function resolveUidHashForHeaders(authInfo: ReturnType<typeof authBridge.getAuthInfo>): string {
  if (!authInfo) return getCachedUidHash();

  const direct =
    (authInfo as { uidHash?: unknown }).uidHash ??
    (authInfo as { uid_hash?: unknown }).uid_hash;
  if (direct !== undefined && direct !== null && String(direct).trim()) {
    return String(direct).trim();
  }

  const user =
    authInfo.user && typeof authInfo.user === "object"
      ? (authInfo.user as Record<string, unknown>)
      : null;
  if (user) {
    for (const key of ["uid_hash", "uidHash", "uid"]) {
      const value = user[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
  }

  return getCachedUidHash();
}

/** 平台 API（知识库 / 智能体对话）请求头，供 fetch 流式调用复用 */
export function buildPlatformAuthHeaders(): Record<string, string> {
  const authInfo = authBridge.getAuthInfo();
  const authHeaders = buildAuthHeaders(authInfo, {
    clientName: import.meta.env.VITE_AI101_CLIENT_NAME || "mvp-template",
    platform: "h5",
    version: "1.0.0",
  }) as Record<string, string>;

  const uidHash = resolveUidHashForHeaders(authInfo);
  if (uidHash) {
    authHeaders["X-Uid-Hash"] = uidHash;
    authHeaders["X-Uid"] = uidHash;
  }
  return authHeaders;
}

const createApiInstance = (): ApiClient => {
  const instance = axios.create({
    baseURL: settings.api,
    timeout: 30000,
    withCredentials: true,
  });

  instance.interceptors.request.use((config) => {
    const authHeaders = buildPlatformAuthHeaders();

    config.headers = AxiosHeaders.concat(authHeaders, config.headers);

    // FormData 必须由运行时自动带 multipart boundary，不能沿用 application/json
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      const headers = AxiosHeaders.from(config.headers);
      headers.delete("Content-Type");
      headers.delete("content-type");
      config.headers = headers;
    }

    return config;
  });

  instance.interceptors.response.use(
    (response) => response.data,
    (error) => Promise.reject(error)
  );

  return instance as ApiClient;
};

export const request = createApiInstance();

export const get = async (config: { url: string; params?: Record<string, unknown> }) => {
  const { url, params } = config;
  return request.get(url, { params });
};
