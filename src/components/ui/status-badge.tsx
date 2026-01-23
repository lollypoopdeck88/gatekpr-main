import { cn } from '@/lib/utils';

type Status = 'pending' | 'paid' | 'overdue' | 'approved' | 'denied';

interface StatusBadgeProps {
  status: Status;
  className?: string;
  children?: React.ReactNode;
}

export type { StatusBadgeProps };

const statusStyles: Record<Status, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  denied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabels: Record<Status, string> = {
  pending: 'Pending',
  paid: 'Paid',
  approved: 'Approved',
  overdue: 'Overdue',
  denied: 'Denied',
};

export function StatusBadge({ status, className, children }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        statusStyles[status],
        className
      )}
    >
      {children || statusLabels[status]}
    </span>
  );
}
