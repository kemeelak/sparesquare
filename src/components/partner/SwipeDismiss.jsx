import React, { useRef, useState } from "react";

// Drag a layer to the left and let it go. Vertical scrolling is left alone.
export default function SwipeDismiss({ onDismiss, children }) {
  const [dx, setDx] = useState(0);
  const [gone, setGone] = useState(false);
  const start = useRef(null);

  const begin = (e) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, engaged: false };
  };

  const move = (e) => {
    if (!start.current) return;
    const t = e.touches[0];
    const mx = t.clientX - start.current.x;
    const my = t.clientY - start.current.y;
    if (!start.current.engaged) {
      if (Math.abs(mx) < 12 || Math.abs(mx) <= Math.abs(my)) return;
      start.current.engaged = true;
    }
    setDx(Math.min(0, mx));
  };

  const end = () => {
    const travelled = dx;
    const dragging = start.current?.engaged;
    start.current = null;
    if (travelled < -90) {
      setDx(-420);
      setGone(true);
      setTimeout(onDismiss, 180);
      return;
    }
    if (dragging || travelled !== 0) setDx(0);
  };

  return (
    <div
      className="tw-swipe"
      onTouchStart={begin}
      onTouchMove={move}
      onTouchEnd={end}
      onTouchCancel={end}
    >
      <span className="tw-swipe-hint" style={{ opacity: Math.min(1, Math.abs(dx) / 90) }}>
        Let it go
      </span>
      <div
        className="tw-swipe-body"
        style={{
          transform: `translateX(${dx}px)`,
          transition: start.current ? "none" : "transform .22s cubic-bezier(.2,.8,.25,1), opacity .18s",
          opacity: gone ? 0 : 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}