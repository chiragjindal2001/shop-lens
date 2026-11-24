import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorBody, AuthResponse } from '@shared';

export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** The access token lives in memory only (never localStorage). */
let accessToken: string | null = null;
export const getAccessToken = () => accessToken;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};

let onAuthLost: (() => void) | null = null;
export const setAuthLostHandler = (fn: (() => void) | null) => {
  onAuthLost = fn;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const http = axios.create({ baseURL: API_BASE, withCredentials: true });

http.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

let refreshing: Promise<AuthResponse> | null = null;

/** One refresh at a time: concurrent callers (StrictMode, parallel 401s) share the same request. */
export function refreshSession(): Promise<AuthResponse> {
  refreshing ??= axios
    .post<AuthResponse>(`${API_BASE}/auth/refresh`, null, { withCredentials: true })
    .then((r) => {
      setAccessToken(r.data.accessToken);
      return r.data;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

const NO_REFRESH = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/logout'];

http.interceptors.response.use(undefined, async (error: AxiosError) => {
  const cfg = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  if (error.response?.status === 401 && cfg && !cfg._retried && !NO_REFRESH.some((p) => cfg.url?.startsWith(p))) {
    cfg._retried = true;
    try {
      await refreshSession();
      return http(cfg); // retry once with the new token
    } catch {
      setAccessToken(null);
      onAuthLost?.();
    }
  }
  throw toApiError(error);
});

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body?.error) return new ApiError(body.error.message, err.response?.status, body.error.code, body.error.fields);
    if (!err.response) return new ApiError('Cannot reach the server. Check your connection and try again.');
  }
  return new ApiError('Something went wrong. Please try again.');
}
