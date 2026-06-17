'use client';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// Mobile layout: the campus map fills the screen and this draggable sheet rides
// over it (peek / half / full snap points), holding the Sidebar's list. When a
// detail page is open (building / room / parking / library / spot) the sheet
// becomes a full-screen slide-over instead — the Sidebar renders that detail
// with its own back header. The Sidebar stays mounted across both modes so its
// search query and drill-down state survive.
interface MobileSheetProps {
  detailOpen: boolean;
  children: React.ReactNode;
}

export default function MobileSheet({ detailOpen, children }: MobileSheetProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageH, setStageH] = useState(0);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStageH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const snaps = useMemo(
    () => ({ peek: 188, mid: Math.round(stageH * 0.5), full: Math.max(stageH - 56, 0) }),
    [stageH]
  );

  const [sheetH, setSheetH] = useState(0);
  // Open at the half snap once the stage has been measured.
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && stageH > 0) {
      initialized.current = true;
      setSheetH(snaps.mid);
    }
  }, [stageH, snaps.mid]);

  // A detail page is a full-screen slide-over (the sheet's height is ignored
  // while it's open), so we leave sheetH untouched. Backing out then restores
  // the exact snap the sheet was at before the detail opened.

  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startY: number; startH: number } | null>(null);

  const nearestSnap = useCallback(
    (h: number) => {
      const opts = [snaps.peek, snaps.mid, snaps.full];
      return opts.reduce((a, b) => (Math.abs(b - h) < Math.abs(a - h) ? b : a));
    },
    [snaps]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = { startY: e.clientY, startH: sheetH };
      setDragging(true);
    },
    [sheetH]
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current) return;
      const dy = drag.current.startY - e.clientY;
      const h = Math.max(snaps.peek - 40, Math.min(snaps.full, drag.current.startH + dy));
      setSheetH(h);
    },
    [snaps]
  );
  const onPointerUp = useCallback(() => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    setSheetH((h) => nearestSnap(h));
  }, [nearestSnap]);

  return (
    <div ref={stageRef} className="pointer-events-none absolute inset-0 z-20">
      <div
        className={
          detailOpen
            ? 'br-slideover pointer-events-auto absolute inset-0 flex flex-col bg-background'
            : 'pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[18px] bg-background'
        }
        style={
          detailOpen
            ? undefined
            : {
                height: sheetH,
                boxShadow: '0 -8px 32px rgba(0,0,0,0.16)',
                transition: dragging ? 'none' : 'height 300ms cubic-bezier(0.32,0.72,0,1)',
              }
        }
      >
        {/* Grabber / drag handle (kept mounted, hidden in detail mode so the
            Sidebar below it never remounts) */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="flex shrink-0 cursor-grab justify-center pb-2 pt-2.5 active:cursor-grabbing"
          style={{ touchAction: 'none', display: detailOpen ? 'none' : 'flex' }}
        >
          <div className="h-[5px] w-9 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
