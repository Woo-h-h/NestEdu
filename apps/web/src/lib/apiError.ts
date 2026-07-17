import axios from "axios";

type ApiErrorBody = {
  errorMessage?: string;
  error?: string;
  message?: string;
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return (
      error.response?.data?.errorMessage ||
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
