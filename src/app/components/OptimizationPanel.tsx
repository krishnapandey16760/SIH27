'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

// Backend integration: GET /api/optimization/status → returns current run state
const LATEST_RUN = {
  id: 'run-20260905-001',
  startedAt: '09:12 IST',
  completedAt: '09:18 IST',
  status: 'Converged',
  milpScore: 94.2,
  gaGenerations: 142,
  delayReduction: '3.4h',
  conflictsResolved: 5,
  blocksScheduled: 47,
};

export default function OptimizationPanel() {
  const [expanded, setExpanded] = useState(true);
  const [milpProgress] = useState(94);
  const [gaProgress] = useState(100);

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
            Converged
          </span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4 fade-in">
          {/* Run info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono-data">{LATEST_RUN?.id}</span>
            <span>{LATEST_RUN?.startedAt} → {LATEST_RUN?.completedAt}</span>
          </div>

          {/* MILP progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-foreground">MILP Layer (OR-Tools)</span>
              <span className="text-xs font-bold text-primary font-mono-data">{milpProgress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${milpProgress}%` }}
              />
            </div>
            <p className="text-2xs text-muted-foreground mt-1">
              Objective: min(delay_hours) + max(priority_score) · 47 blocks scheduled
            </p>
          </div>

          {/* GA progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-foreground">GA Layer (DEAP)</span>
              <span className="text-xs font-bold text-positive font-mono-data">142 gen</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-positive transition-all duration-500"
                style={{ width: `${gaProgress}%` }}
              />
            </div>
            <p className="text-2xs text-muted-foreground mt-1">
              Population: 200 chromosomes · Crossover: 0.7 · Mutation: 0.05
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'stat-delay', label: 'Delay Reduction', value: LATEST_RUN?.delayReduction, positive: true },
              { id: 'stat-conflicts', label: 'Conflicts Resolved', value: LATEST_RUN?.conflictsResolved, positive: true },
              { id: 'stat-blocks', label: 'Blocks Scheduled', value: LATEST_RUN?.blocksScheduled, positive: true },
              { id: 'stat-score', label: 'MILP Score', value: `${LATEST_RUN?.milpScore}%`, positive: true },
            ]?.map((s) => (
              <div key={s?.id} className="bg-muted/40 rounded-lg p-2.5">
                <p className="text-2xs text-muted-foreground">{s?.label}</p>
                <p className="text-sm font-bold text-foreground font-mono-data mt-0.5">{s?.value}</p>
              </div>
            ))}
          </div>

          {/* Re-run button */}
          <button
            className="btn-primary w-full justify-center text-xs"
            onClick={() =>
              toast?.info('New optimization run queued for 09:40 IST window')
            }
          >
            <Play size={12} />
            Re-run for Next Window
          </button>
        </div>
      )}
    </div>
  );
}