import axios from "axios";

type ApiErrorBody = {
  errorMessage?: string;
  error?: string;
  message?: string;
  error_message?: string;
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const status = error.response?.status;
    const bodyMsg = (
      error.response?.data?.errorMessage ||
      error.response?.data?.error_message ||
      error.response?.data?.error ||
      error.response?.data?.message ||
      ""
    ).trim();

    if (status === 401 || status === 403) {
      if (status === 401) {
        return bodyMsg || "未登录或登录已过期，请重新登录平台后再试"
      }
      // 平台常只回「没有权限」，补全可操作说明
      if (!bodyMsg || /^没有权限/.test(bodyMsg)) {
        return "没有权限（403）。误入「教师成果库/手机号文件夹」的文件常无法在本系统删除：可先点「纠正到教案库」，或到平台知识库手动删除/改目录。"
      }
      return bodyMsg
    }
    if (status === 404) {
      return bodyMsg || "资源不存在或无权访问（404）";
    }

    return bodyMsg || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
