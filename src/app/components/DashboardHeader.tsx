'use client';

import React, { useState } from 'react';
import { Play, Download, Calendar, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const TIME_RANGES = ['Daily', 'Weekly', 'Monthly'] as const;
type TimeRange = (typeof TIME_RANGES)[number];

export default function DashboardHeader() {
  const [timeRange, setTimeRange] = useState<TimeRange>('Daily');
  const [running, setRunning] = useState(false);

  const handleOptimize = () => {
    setRunning(true);
    // Backend integration: POST /api/optimization/run { date: today, zone: 'NR' }
    setTimeout(() => {
      setRunning(false);
      toast.success('Optimization run queued — MILP+GA solver starting', {
        description: 'Est. completion: 2–4 minutes. Results will appear in the Gantt chart.',
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-foreground">Block Planning Dashboard</h1>
          <span className="status-badge bg-positive-tint text-positive">
            <span className="w-1.5 h-1.5 rounded-full bg-positive" />
            Live
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Northern Railways · 05 Sep 2026 · IST timezone · NR Division
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Time range switcher */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted border border-border">
          {TIME_RANGES.map((r) => (
            <button
              key={`range-${r}`}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                timeRange === r
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Date picker */}
        <button className="btn-secondary text-sm gap-2">
          <Calendar size={14} />
          05 Sep 2026
          <ChevronDown size={12} />
        </button>

        {/* Export */}
        <button
          className="btn-secondary text-sm"
          onClick={() => toast.info('Exporting block schedule PDF…')}
        >
          <Download size={14} />
          Export
        </button>

        {/* Run optimization */}
        <button
          className="btn-primary text-sm"
          onClick={handleOptimize}
          disabled={running}
        >
          {running ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 60" />
              </svg>
              Running…
            </>
          ) : (
            <>
              <Play size={14} />
              Run Optimization
            </>
          )}
        </button>
      </div>
    </div>
  );
}