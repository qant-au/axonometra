// What a wheel event does to the plan, per the shared keymap: the plain wheel
// pans, Shift + wheel pans sideways, and Ctrl/Cmd + wheel zooms (a trackpad
// pinch arrives as Ctrl + wheel). Pure, so it is tested on its own; Main
// applies the result.

export interface WheelLike {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export type WheelResult =
  { kind: 'pan'; dx: number; dy: number } | { kind: 'zoom'; factor: number };

const LINE = 40;
const PAGE = 800;

export function interpretWheel(e: WheelLike): WheelResult {
  const unit = e.deltaMode === 1 ? LINE : e.deltaMode === 2 ? PAGE : 1;
  if (e.ctrlKey || e.metaKey) {
    // Two to the power of the scroll, so in and out cancel exactly; a pinch
    // sends small deltas, a mouse wheel click about 100.
    return { kind: 'zoom', factor: Math.pow(2, (-e.deltaY * unit) / 300) };
  }
  let dx = e.deltaX * unit;
  let dy = e.deltaY * unit;
  // Most macOS browsers already turn Shift + wheel into deltaX; a mouse
  // wheel on Windows and Linux does not.
  if (e.shiftKey && dx === 0) {
    dx = dy;
    dy = 0;
  }
  return { kind: 'pan', dx: dx + 0, dy: dy + 0 };
}
