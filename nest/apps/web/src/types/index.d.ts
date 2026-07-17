export interface ApiSuccess<T> {
  success: true;
  status: "ok";
  result: T;
}

export interface ApiError {
  success: false;
  errorCode: number;
  errorMessage: string;
}
