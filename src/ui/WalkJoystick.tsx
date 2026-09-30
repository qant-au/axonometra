import { PointerEvent, useRef, useState } from 'react';
import { Box } from '@mui/material';

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
    <Box
      sx={{
        position: 'absolute',
        left: 24,
        bottom: 24,
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'rgb(0 0 0 / 12%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none'
      }}
      aria-hidden
      onPointerDown={down}
      onPointerMove={track}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgb(255 255 255 / 85%)',
          boxShadow: '0 1px 4px rgb(0 0 0 / 30%)',
          pointerEvents: 'none'
        }}
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </Box>
  );
}
