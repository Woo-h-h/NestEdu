import { authBridge } from "@/lib/authBridge";
import { buildAuthHeaders } from "@zcat-open/auth-bridge";
import axios, { AxiosHeaders, AxiosInstance, AxiosRequestConfig } from "axios";

const apiBaseURL = (import.meta.env.VITE_API_BASE_URL || "").trim();

export const settings = {
  api: apiBaseURL.replace(/\/$/, ""),
};

export interface ApiClient extends Omit<AxiosInstance, "get" | "post" | "put" | "delete"> {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

const createApiInstance = (): ApiClient => {
  const instance = axios.create({
    baseURL: settings.api,
    timeout: 30000,
    withCredentials: true,
  });

  instance.interceptors.request.use((config) => {
    const authHeaders = buildAuthHeaders(authBridge.getAuthInfo(), {
      clientName: import.meta.env.VITE_AI101_CLIENT_NAME || "mvp-template",
      platform: "h5",
      version: "1.0.0",
    });

    config.headers = AxiosHeaders.concat(authHeaders, config.headers);
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
