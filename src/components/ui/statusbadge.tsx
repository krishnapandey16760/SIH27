import React from 'react';

type Status =
  | 'Pending' |'Scheduled' |'Active' |'Completed' |'Cancelled' |'Approved' |'Draft' |'Conflict' |'Running' |'Converged' |'Failed';

const STATUS_CONFIG: Record<
  Status,
  { bg: string; text: string; dot: string }
> = {
  Pending: { bg: 'bg-warning-tint', text: 'text-warning', dot: 'bg-warning' },
  Scheduled: { bg: 'bg-info-tint', text: 'text-info', dot: 'bg-info' },
  Active: { bg: 'bg-positive-tint', text: 'text-positive', dot: 'bg-positive' },
  Completed: {
    bg: 'bg-muted/60',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
  Cancelled: {
    bg: 'bg-muted/60',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
  Approved: { bg: 'bg-positive-tint', text: 'text-positive', dot: 'bg-positive' },
  Draft: {
    bg: 'bg-muted/60',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
  Conflict: { bg: 'bg-negative-tint', text: 'text-negative', dot: 'bg-negative' },
  Running: { bg: 'bg-info-tint', text: 'text-info', dot: 'bg-info' },
  Converged: {
    bg: 'bg-positive-tint',
    text: 'text-positive',
    dot: 'bg-positive',
  },
  Failed: { bg: 'bg-negative-tint', text: 'text-negative', dot: 'bg-negative' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['Draft'];
  return (
    <span
      className={`status-badge ${cfg.bg} ${cfg.text}`}
      style={{ border: 'none' }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
      {status}
    </span>
  );
}