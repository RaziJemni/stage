import type { ProblemDetail } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const CSRF_COOKIE_NAME = import.meta.env.VITE_CSRF_COOKIE_NAME ?? 'vayca_csrf';
export const AUTHENTICATION_REQUIRED_EVENT = 'vayca:authentication-required';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(problem: ProblemDetail) {
    super(problem.detail);
    this.name = 'ApiError';
    this.status = problem.status;
    this.code = problem.code;
  }
}

function csrfToken(): string | undefined {
  const prefix = `${CSRF_COOKIE_NAME}=`;
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = csrfToken();
    if (token) {
      headers.set('X-CSRF-Token', decodeURIComponent(token));
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    const fallback: ProblemDetail = {
      title: 'Request failed',
      detail: 'The server could not complete the request.',
      status: response.status,
      code: `http_${response.status}`,
    };
    const problem = await response.json().catch(() => fallback) as ProblemDetail;
    if (response.status === 401) {
      window.dispatchEvent(new Event(AUTHENTICATION_REQUIRED_EVENT));
    }
    throw new ApiError(problem);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
