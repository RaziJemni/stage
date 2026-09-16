import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVisiblePolling } from './useVisiblePolling';

function PollingHarness({ refresh }: { refresh: () => void | Promise<void> }) {
  useVisiblePolling(refresh, 10_000);
  return null;
}

describe('useVisiblePolling', () => {
  const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalHidden) Object.defineProperty(document, 'hidden', originalHidden);
  });

  it('refreshes while visible, pauses while hidden, and refreshes on return', async () => {
    const refresh = vi.fn();
    render(<PollingHarness refresh={refresh} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(refresh).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(refresh).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('does not overlap a slow refresh', async () => {
    let resolveRefresh: (() => void) | undefined;
    const refresh = vi.fn(() => new Promise<void>((resolve) => { resolveRefresh = resolve; }));
    render(<PollingHarness refresh={refresh} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefresh?.();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
