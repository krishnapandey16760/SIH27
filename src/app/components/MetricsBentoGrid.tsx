'use client';

import React from 'react';
import MetricCard from './MetricCard';
import { useDashboard } from '@/context/DashboardContext';
import { generateMetrics } from '@/lib/dashboardData';

export default function MetricsBentoGrid() {
  const { seed, timeRange } = useDashboard();
  const metrics = generateMetrics(seed, timeRange);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
      {metrics.map((m) => (
        <MetricCard key={m.id} {...m} />
      ))}
    </div>
  );
}
