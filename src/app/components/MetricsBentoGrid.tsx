import React from 'react';
import MetricCard from './MetricCard';

// Backend integration: GET /api/metrics/dashboard?date=2026-09-05&zone=NR
const METRICS = [
  {
    id: 'metric-utilization',
    label: 'Block Utilization Rate',
    value: '78.4%',
    delta: '+3.2%',
    deltaPositive: true,
    sub: '47 of 60 available windows used',
    variant: 'default' as const,
    span: 1,
  },
  {
    id: 'metric-delay',
    label: 'Train Delay Hours',
    value: '12.7h',
    delta: '+1.4h vs yesterday',
    deltaPositive: false,
    sub: 'MILP objective: minimize to <10h',
    variant: 'warning' as const,
    span: 1,
  },
  {
    id: 'metric-fulfillment',
    label: 'Priority Fulfillment',
    value: '91.2%',
    delta: '+5.8% this week',
    deltaPositive: true,
    sub: 'Critical: 100% · High: 87% · Med: 89%',
    variant: 'positive' as const,
    span: 1,
  },
  {
    id: 'metric-conflicts',
    label: 'Active Conflicts',
    value: '3',
    delta: '2 critical, 1 high',
    deltaPositive: false,
    sub: 'NDLS-AGC UP · MTJ-CNB DN · GZB-SBB UP',
    variant: 'alert' as const,
    span: 1,
  },
  {
    id: 'metric-segments',
    label: 'Segments Under Maintenance',
    value: '11',
    delta: '4 Civil · 5 OHE · 2 S&T',
    deltaPositive: true,
    sub: 'Of 68 total NR track segments',
    variant: 'default' as const,
    span: 1,
  },
  {
    id: 'metric-mts',
    label: 'Mean Time to Schedule',
    value: '4.3h',
    delta: '-0.6h vs last week',
    deltaPositive: true,
    sub: 'From request submission to approved block',
    variant: 'default' as const,
    span: 1,
  },
];

export default function MetricsBentoGrid() {
  // 6 cards → grid-cols-3 xl:grid-cols-6 — clean single row on large screens, 3x2 on medium
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
      {METRICS.map((m) => (
        <MetricCard key={m.id} {...m} />
      ))}
    </div>
  );
}