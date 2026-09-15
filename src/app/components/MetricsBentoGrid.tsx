'use client';

import React, { useMemo } from 'react';
import { Wrench } from 'lucide-react';
import { useMaintenanceRequests } from '@/lib/useMaintenanceRequests';
import type { Dept } from '@/lib/maintenanceRequests';
import { INITIAL_EDGES } from '@/app/network-graph-viewer/components/NetworkGraphClient';

const DEPT_COLORS: Record<Dept, string> = {
  Civil: 'bg-amber-500',
  OHE: 'bg-sky-500',
  'S&T': 'bg-emerald-500',
};

export default function MetricsBentoGrid() {
  const { requests } = useMaintenanceRequests();
  const totalSegments = INITIAL_EDGES.length;

  const { segmentCount, deptCounts, activeCount } = useMemo(() => {
    const active = requests.filter((r) => r.status !== 'Completed');
    const segments = new Set(active.map((r) => r.segment));
    const counts: Record<Dept, number> = { Civil: 0, OHE: 0, 'S&T': 0 };
    active.forEach((r) => {
      counts[r.dept] = (counts[r.dept] ?? 0) + 1;
    });
    return { segmentCount: segments.size, deptCounts: counts, activeCount: active.length };
  }, [requests]);

  const pct = totalSegments > 0 ? Math.min(100, Math.round((segmentCount / totalSegments) * 100)) : 0;

  return (
    <div className="grid grid-cols-1">
      <div className="card-surface p-6 max-w-md">
        <div className="flex items-center gap-2 mb-1">
          <Wrench size={16} className="text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Segments Under Maintenance
          </span>
        </div>

        <div className="flex items-end gap-2 mt-2">
          <span className="text-4xl font-bold text-foreground">{segmentCount}</span>
          <span className="text-sm text-muted-foreground mb-1">
            of {totalSegments} total NR track segments
          </span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-muted mt-3 overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="flex items-center gap-4 mt-4 text-xs flex-wrap">
          {(Object.keys(deptCounts) as Dept[]).map((dept) => (
            <div key={dept} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${DEPT_COLORS[dept]}`} />
              <span className="text-muted-foreground">
                {dept}: <span className="text-foreground font-semibold">{deptCounts[dept]}</span>
              </span>
            </div>
          ))}
        </div>

        <p className="text-2xs text-muted-foreground mt-3">
          {activeCount} active maintenance {activeCount === 1 ? 'request' : 'requests'} across{' '}
          {segmentCount} track {segmentCount === 1 ? 'segment' : 'segments'}
        </p>
      </div>
    </div>
  );
}