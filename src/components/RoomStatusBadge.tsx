import { cn } from '@/lib/utils';
import type { AvailabilityStatus } from '@/types';

interface RoomStatusBadgeProps {
  status: AvailabilityStatus;
  className?: string;
}

const statusConfig: Record<AvailabilityStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-green-100 text-green-800 border-green-200' },
  in_use: { label: 'In Use', className: 'bg-red-100 text-red-800 border-red-200' },
  limited: { label: 'Limited', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export default function RoomStatusBadge({ status, className }: RoomStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
