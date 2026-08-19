'use client';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// Mobile layout: the campus map fills the screen and this draggable sheet rides
// over it (peek / half / full snap points), holding the Sidebar's list. Opening
// a detail page (building / room / parking / library / spot) expands the sheet
// to (nearly) full so the detail's room list gets most of the screen, and
// renders that detail inside it (with its own back header). Backing out restores
// the snap the sheet was at before the detail opened. The Sidebar stays mounted
// so its search query and drill-down state survive.
interface MobileSheetProps {
  children: React.ReactNode;
  // True while any detail page is open. Drives the auto-expand / restore.
  detailOpen?: boolean;
}

export default function MobileSheet({ children, detailOpen = false }: MobileSheetProps) {
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

  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startY: number; startH: number } | null>(null);

  const nearestSnap = useCallback(
    (h: number) => {
      const opts = [snaps.peek, snaps.mid, snaps.full];
      return opts.reduce((a, b) => (Math.abs(b - h) < Math.abs(a - h) ? b : a));
    },
    [snaps]
  );

  // Opening a detail expands the sheet to full so its room list gets most of the
  // screen; backing out restores the snap the sheet was at beforehand. We stash
  // that snap in a ref on the open transition and replay it on close. Dragging
  // while a detail is open just moves the sheet and doesn't disturb the stash.
  const restoreRef = useRef<number | null>(null);
  const prevDetailOpen = useRef(false);
  useEffect(() => {
    if (detailOpen === prevDetailOpen.current) return;
    prevDetailOpen.current = detailOpen;
    if (detailOpen) {
      restoreRef.current = sheetH;
      setSheetH(snaps.full);
    } else if (restoreRef.current != null) {
      setSheetH(nearestSnap(restoreRef.current));
      restoreRef.current = null;
    }
  }, [detailOpen, sheetH, snaps.full, nearestSnap]);

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
        className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[18px] bg-background"
        style={{
          height: sheetH,
          boxShadow: '0 -8px 32px rgba(0,0,0,0.16)',
          transition: dragging ? 'none' : 'height 300ms cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Grabber / drag handle — works for the list and detail pages alike,
            so the sheet stays draggable while a building/room page is open. */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="flex shrink-0 cursor-grab justify-center pb-2.5 pt-3.5 active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        >
          <div className="h-1.5 w-16 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
