import React, { useEffect, useRef } from 'react';

interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void;
  size?: number;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  size = 92,
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const centerRef = useRef<{ cx: number; cy: number }>({ cx: 0, cy: 0 });
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const maxRadius = Math.round(size * 0.35);

  // Only reset virtualMove on actual unmount — never on parent HUD re-renders!
  useEffect(() => {
    return () => {
      onMoveRef.current(0, 0);
    };
  }, []);

  const applyKnobVisual = (dx: number, dy: number, active: boolean) => {
    const knob = knobRef.current;
    if (!knob) return;
    knob.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    knob.style.backgroundColor = active ? '#e5aa38' : 'rgba(217, 155, 38, 0.9)';
    knob.style.borderColor = active
      ? 'rgba(255, 245, 214, 0.78)'
      : 'rgba(245, 242, 235, 0.42)';
  };

  const updateFromClient = (clientX: number, clientY: number) => {
    const { cx, cy } = centerRef.current;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist > maxRadius && dist > 0) {
      const scale = maxRadius / dist;
      dx *= scale;
      dy *= scale;
    }

    const nx = dx / maxRadius;
    const ny = dy / maxRadius;
    const mag = Math.hypot(nx, ny);

    applyKnobVisual(dx, dy, true);
    if (mag < 0.08) {
      onMoveRef.current(0, 0);
    } else {
      onMoveRef.current(nx, ny);
    }
  };

  const resetStick = () => {
    pointerIdRef.current = null;
    applyKnobVisual(0, 0, false);
    onMoveRef.current(0, 0);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (pointerIdRef.current !== null) return;
    const el = baseRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    centerRef.current = {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    };

    pointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unsupported
    }
    updateFromClient(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateFromClient(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
    resetStick();
  };

  const knobSize = Math.round(size * 0.42);

  return (
    <div
      ref={baseRef}
      role="application"
      aria-label="Joystick gerak karakter"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={() => {
        if (pointerIdRef.current !== null) resetStick();
      }}
      onContextMenu={(e) => e.preventDefault()}
      style={{ width: size, height: size, touchAction: 'none' }}
      className="relative rounded-full bg-[#121614]/78 border border-white/20 shadow-xl touch-none select-none flex items-center justify-center cursor-grab active:cursor-grabbing"
    >
      {/* Subtle cross directional ticks */}
      <div className="pointer-events-none absolute inset-2 rounded-full border border-white/8" />
      <span className="pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/30" />
      <span className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/30" />
      <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/30" />
      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/30" />

      {/* Movable thumb knob */}
      <div
        ref={knobRef}
        style={{
          width: knobSize,
          height: knobSize,
          transform: 'translate3d(0px, 0px, 0)',
          backgroundColor: 'rgba(217, 155, 38, 0.9)',
          borderColor: 'rgba(245, 242, 235, 0.42)',
        }}
        className="pointer-events-none rounded-full border shadow-md will-change-transform"
      />
    </div>
  );
};
