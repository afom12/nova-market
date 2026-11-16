import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useCartStore } from '@/store/cart.store';

// jsdom implements neither of these, and Radix/our components call both.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

window.scrollTo = vi.fn();

beforeEach(() => {
  // Zustand state is module-level, so it must be reset between tests or
  // results depend on execution order.
  useCartStore.setState({ lines: [] });
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
