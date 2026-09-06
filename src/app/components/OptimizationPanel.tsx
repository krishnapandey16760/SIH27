'use client';

import React, { useState } from 'react';
import { Cpu, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useDashboard } from '@/context/DashboardContext';
import { generateOptimizationRun } from '@/lib/dashboardData';

export default function OptimizationPanel() {
  const [expanded, setExpanded] = useState(true);
  const { seed, now, triggerRun } = useDashboard();
  const run = generateOptimizationRun(seed, now);

  const milpProgress = Math.round(run.milpScore);
  const gaProgress = Math.min(100, Math.round((run.gaGenerations / 200) * 100));

  const handleRerun = () => {
    triggerRun(); // bumps seed → metrics, gantt, and this panel all recompute
    toast.info('New optimization run queued', {
      description: 'MILP+GA solver recalculating for the next window…',
    });
  };

  return (
    <div className="card-surface overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Optimization Engine</span>
          <span className="status-badge bg-positive-tint text-positive">
            <span className="w-1.5 h-1.5 rounded-full bg-positive" />
            {run.status}
          </span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4 fade-in">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono-data">{run.id}</span>
            <span>{run.startedAt} → {run.completedAt}</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-foreground">MILP Layer (OR-Tools)</span>
              <span className="text-xs font-bold text-primary font-mono-data">{milpProgress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${milpProgress}%` }} />
            </div>
            <p className="text-2xs text-muted-foreground mt-1">
              Objective: min(delay_hours) + max(priority_score) · {run.blocksScheduled} blocks scheduled
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-foreground">GA Layer (DEAP)</span>
              <span className="text-xs font-bold text-positive font-mono-data">{run.gaGenerations} gen</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-positive transition-all duration-500" style={{ width: `${gaProgress}%` }} />
            </div>
            <p className="text-2xs text-muted-foreground mt-1">
              Population: 200 chromosomes · Crossover: 0.7 · Mutation: 0.05
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'stat-delay', label: 'Delay Reduction', value: run.delayReduction },
              { id: 'stat-conflicts', label: 'Conflicts Resolved', value: run.conflictsResolved },
              { id: 'stat-blocks', label: 'Blocks Scheduled', value: run.blocksScheduled },
              { id: 'stat-score', label: 'MILP Score', value: `${run.milpScore}%` },
            ].map((s) => (
              <div key={s.id} className="bg-muted/40 rounded-lg p-2.5">
                <p className="text-2xs text-muted-foreground">{s.label}</p>
                <p className="text-sm font-bold text-foreground font-mono-data mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>

          <button className="btn-primary w-full justify-center text-xs" onClick={handleRerun}>
            <Play size={12} />
            Re-run for Next Window
          </button>
        </div>
      )}
    </div>
  );
}
