'use client';

import React, { useState } from 'react';
import { Play, Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useDashboard, TimeRange } from '@/context/DashboardContext';
import { generateMetrics, generateGantt, exportMetricsCSV, exportGanttCSV } from '@/lib/dashboardData';

const TIME_RANGES: TimeRange[] = ['Daily', 'Weekly', 'Monthly'];

function toInputDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DashboardHeader() {
  const { selectedDate, setSelectedDate, timeRange, setTimeRange, now, seed, triggerRun } = useDashboard();
  const [running, setRunning] = useState(false);

  const liveTime = now.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const handleOptimize = () => {
    setRunning(true);
    // Backend integration: POST /api/optimization/run { date: selectedDate, zone: 'NR', timeRange }
    setTimeout(() => {
      setRunning(false);
      triggerRun(); // regenerates metrics, gantt & optimization stats app-wide
      toast.success('Optimization run complete — schedule updated', {
        description: 'MILP+GA solver converged. Gantt chart and metrics refreshed.',
      });
    }, 1500);
  };

  const handleExport = () => {
    const metrics = generateMetrics(seed, timeRange);
    const gantt = generateGantt(seed, timeRange);
    const csv =
      `Block Planning Export - ${formatDisplayDate(selectedDate)} (${timeRange})\n\n` +
      `== Metrics ==\n${exportMetricsCSV(metrics)}\n\n` +
      `== Schedule ==\n${exportGanttCSV(gantt)}`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `block-schedule-${toInputDate(selectedDate)}-${timeRange.toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast.success('Schedule exported', { description: a.download });
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
          Northern Railways · {formatDisplayDate(selectedDate)} · {liveTime} IST · NR Division
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

        {/* Date picker — transparent native input overlaid on styled label */}
        <label className="btn-secondary text-sm gap-2 relative cursor-pointer select-none">
          <Calendar size={14} />
          <span>{formatDisplayDate(selectedDate)}</span>
          <input
            type="date"
            value={toInputDate(selectedDate)}
            onChange={(e) => {
              if (!e.target.value) return;
              const [y, m, d] = e.target.value.split('-').map(Number);
              setSelectedDate(new Date(y, m - 1, d));
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            style={{ colorScheme: 'dark' }}
          />
        </label>

        {/* Export */}
        <button className="btn-secondary text-sm" onClick={handleExport}>
          <Download size={14} />
          Export
        </button>

        {/* Run optimization */}
        <button className="btn-primary text-sm" onClick={handleOptimize} disabled={running}>
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
