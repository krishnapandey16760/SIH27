import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  sub: string;
  variant: 'default' | 'positive' | 'warning' | 'alert';
  span?: number;
}

const VARIANT_STYLES = {
  default: 'card-surface',
  positive: 'card-surface border-positive/20 bg-positive-tint',
  warning: 'card-surface border-warning/20',
  alert: 'card-surface border-negative/30 bg-negative-tint pulse-alert',
};

export default function MetricCard({
  label,
  value,
  delta,
  deltaPositive,
  sub,
  variant,
}: MetricCardProps) {
  return (
    <div className={`${VARIANT_STYLES[variant]} p-4 flex flex-col gap-2 min-w-0`}>
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-tight">
          {label}
        </p>
        {variant === 'alert' && (
          <AlertTriangle size={14} className="text-negative shrink-0 mt-0.5" />
        )}
      </div>
      <p className="text-2xl font-bold text-foreground font-mono-data leading-none">
        {value}
      </p>
      <div className="flex items-center gap-1">
        {deltaPositive ? (
          <TrendingUp size={11} className="text-positive shrink-0" />
        ) : (
          <TrendingDown size={11} className="text-negative shrink-0" />
        )}
        <span
          className={`text-xs font-medium ${deltaPositive ? 'text-positive' : 'text-negative'}`}
        >
          {delta}
        </span>
      </div>
      <p className="text-2xs text-muted-foreground leading-tight truncate">{sub}</p>
    </div>
  );
}