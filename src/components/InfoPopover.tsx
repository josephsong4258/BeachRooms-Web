'use client';
import type { ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// A tap/click-to-open info bubble for short help text. Replaces hover tooltips,
// which Radix doesn't open on touch — so they were unusable on mobile.
export default function InfoPopover({
  trigger,
  children,
  side = 'top',
  align = 'center',
  className,
}: {
  trigger: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className={className ?? 'w-auto max-w-[240px] p-3 text-xs'}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
