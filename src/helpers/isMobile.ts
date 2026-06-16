// Single source of truth for coarse-pointer (touch) detection, replacing the
// react-device-detect dependency. Guarded so it is safe under jsdom/SSR where
// window.matchMedia may be undefined.
export const isMobile =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: coarse)').matches
    : false;
