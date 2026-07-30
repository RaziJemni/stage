import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTHENTICATION_REQUIRED_EVENT, ApiError, apiRequest } from './api';

describe('apiRequest authentication protection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.cookie = 'vayca_csrf=csrf-secret; path=/';
  });

  it('sends the CSRF token on authenticated writes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await apiRequest<void>('/api/v1/auth/logout', { method: 'POST' });

    const request = fetchMock.mock.calls[0][1];
    expect(new Headers(request?.headers).get('X-CSRF-Token')).toBe('csrf-secret');
    expect(request?.credentials).toBe('include');
  });

  it('announces an expired session after a 401 response', async () => {
    const listener = vi.fn();
    window.addEventListener(AUTHENTICATION_REQUIRED_EVENT, listener, { once: true });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          title: 'Authentication required',
          detail: 'Sign in to access this resource.',
          status: 401,
          code: 'authentication_required',
        }),
        { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    );

    await expect(apiRequest('/api/v1/team')).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledOnce();
  });
});
