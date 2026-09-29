import { PointerEvent, useRef, useState } from 'react';
import classes from './ThreeDView.module.css';

/** How far the knob travels from the centre, in pixels. */
const REACH = 40;

// On-screen stick for walking on a touch screen: drag the knob to walk, let
// go to stop. Reports x right and y forward, each -1 to 1.
export function WalkJoystick({
  onChange
}: {
  onChange: (x: number, y: number) => void;
}) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const centre = useRef<{ id: number; x: number; y: number } | null>(null);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const box = e.currentTarget.getBoundingClientRect();
    centre.current = {
      id: e.pointerId,
      x: box.left + box.width / 2,
      y: box.top + box.height / 2
    };
    track(e);
  };
  const track = (e: PointerEvent<HTMLDivElement>) => {
    const c = centre.current;
    if (!c || e.pointerId !== c.id) return;
    let dx = e.clientX - c.x;
    let dy = e.clientY - c.y;
    const length = Math.hypot(dx, dy);
    if (length > REACH) {
      dx = (dx / length) * REACH;
      dy = (dy / length) * REACH;
    }
    setKnob({ x: dx, y: dy });
    onChange(dx / REACH, -dy / REACH);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (centre.current?.id !== e.pointerId) return;
    centre.current = null;
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  };

  return (
    <div
      className={classes.joystick}
      aria-hidden
      onPointerDown={down}
      onPointerMove={track}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div
        className={classes.knob}
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}
