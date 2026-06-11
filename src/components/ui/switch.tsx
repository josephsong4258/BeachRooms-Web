'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  'aria-label'?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-input',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        )}
      />
    </button>
  )
);
Switch.displayName = 'Switch';

export { Switch };
