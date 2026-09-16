import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchConversationCount, fetchUnreadConversationCount } from './messaging';

describe('fetchUnreadConversationCount', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.cookie = 'vayca_csrf=csrf-secret; path=/';
  });

  it('requests one unread conversation page and returns the company-wide total', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      items: [], page: 1, page_size: 1, total: 7, pages: 7,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(fetchUnreadConversationCount()).resolves.toBe(7);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/conversations?unread=true&page_size=1'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('requests one unfiltered conversation page for the all-conversations total', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      items: [], page: 1, page_size: 1, total: 9, pages: 9,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(fetchConversationCount()).resolves.toBe(9);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/conversations?page_size=1'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});
