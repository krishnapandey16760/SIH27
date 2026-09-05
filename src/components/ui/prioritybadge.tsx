import React from 'react';

type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

const PRIORITY_CONFIG: Record<Priority, { bg: string; text: string }> = {
  Critical: { bg: 'bg-negative-tint', text: 'text-negative' },
  High: { bg: 'bg-warning-tint', text: 'text-warning' },
  Medium: { bg: 'bg-info-tint', text: 'text-info' },
  Low: { bg: 'bg-muted/60', text: 'text-muted-foreground' },
};

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG['Low'];
  return (
    <span className={`status-badge ${cfg.bg} ${cfg.text}`}>{priority}</span>
  );
}