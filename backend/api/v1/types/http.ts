export type ApiResult<T> = {
  status: number;
  json: T;
};

export type ApiError = {
  error: string;
};

