import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * A single-page app keeps the scroll position across navigations, which
 * drops the user into the middle of the next page. This resets it, while
 * respecting a reduced-motion preference.
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, [pathname]);

  return null;
};
