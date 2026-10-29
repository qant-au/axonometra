// Small stand-ins for the two newer browser functions Axonometra uses that Safari only has since 15.4
// (older iPads on iOS 15.0–15.3). They only step in when the browser lacks them. The lazily loaded
// 3D and editor bundles come after the main bundle, so they find them as well.

if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, "at", {
    configurable: true,
    writable: true,
    value: function at<T>(this: T[], index: number): T | undefined {
      const i = Math.trunc(index) || 0;
      return this[i < 0 ? this.length + i : i];
    },
  });
}

if (typeof globalThis.structuredClone !== "function") {
  // Axonometra only clones plain JSON data (plans, settings), so a JSON round trip is enough
  (globalThis as { structuredClone: unknown }).structuredClone = <T>(value: T): T => (value === undefined ? value : JSON.parse(JSON.stringify(value)));
}
