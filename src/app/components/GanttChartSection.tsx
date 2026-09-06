'use client';

import React, { useMemo, useState } from 'react';
import { Filter, ZoomIn, ZoomOut, Info, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useDashboard, TimeRange } from '@/context/DashboardContext';
import { generateGantt, exportGanttCSV, totalUnitsFor, SegmentRow } from '@/lib/dashboardData';

const ROW_H = 36;

const BAR_COLORS = {
  train: 'gantt-train-bar',
  block: 'gantt-block-bar',
  conflict: 'gantt-conflict-bar',
};

const DEPT_FILTERS = ['All', 'Civil', 'OHE', 'S&T'] as const;
const LINE_FILTERS = ['All', 'UP', 'DOWN'] as const;

// Maps the UI label (S&T) to the code used inside generated block labels (ST-xxx)
const DEPT_CODE: Record<string, string> = { Civil: 'Civil', OHE: 'OHE', 'S&T': 'ST' };

function getAxisLabels(timeRange: TimeRange): string[] {
  if (timeRange === 'Daily') {
    return Array.from({ length: 25 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  }
  if (timeRange === 'Weekly') {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', ''];
  }
  // Monthly: show a tick every 5 "days" to avoid clutter
  return Array.from({ length: 31 }, (_, i) => (i % 5 === 0 ? `D${i + 1}` : ''));
}

export default function GanttChartSection() {
  const { seed, timeRange, selectedDate, now } = useDashboard();
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [lineFilter, setLineFilter] = useState<string>('All');
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  const allRows: SegmentRow[] = useMemo(() => generateGantt(seed, timeRange), [seed, timeRange]);
  const totalUnits = totalUnitsFor(timeRange);
  const axisLabels = getAxisLabels(timeRange);

  const visibleRows = useMemo(() => {
    return allRows.filter((row) => {
      if (lineFilter !== 'All' && row.lineType !== lineFilter) return false;
      if (deptFilter !== 'All') {
        const code = DEPT_CODE[deptFilter];
        const hasDept = row.bars.some((b) => b.type === 'block' && b.label.startsWith(code));
        if (!hasDept) return false;
      }
      return true;
    });
  }, [allRows, lineFilter, deptFilter]);

  const minutesToPct = (min: number) => (min / totalUnits) * 100;

  // Only show a "now" marker when viewing Daily range for the actual current day
  const isToday = selectedDate.toDateString() === now.toDateString();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNowMarker = timeRange === 'Daily' && isToday;

  const handleExport = () => {
    const csv = exportGanttCSV(visibleRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gantt-${timeRange.toLowerCase()}-${selectedDate.toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Gantt schedule exported', { description: a.download });
  };

  return (
    <div className="card-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Block Schedule — Gantt View</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ·{' '}
            {timeRange} view · Northern Railways · {visibleRows.length} track segments
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Legend */}
          <div className="flex items-center gap-3 mr-2">
            {[
              { cls: 'gantt-train-bar', label: 'Train' },
              { cls: 'gantt-block-bar', label: 'Maint. Block' },
              { cls: 'gantt-conflict-bar', label: 'Conflict' },
            ].map((l) => (
              <div key={`legend-${l.label}`} className="flex items-center gap-1.5">
                <div className={`w-5 h-2.5 ${l.cls}`} />
                <span className="text-2xs text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>

          {/* Line filter */}
          {LINE_FILTERS.map((lf) => (
            <button
              key={`lf-${lf}`}
              onClick={() => setLineFilter(lf)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                lineFilter === lf
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {lf}
            </button>
          ))}

          {/* Dept filter */}
          <div className="flex items-center gap-1 border-l border-border pl-2">
            <Filter size={12} className="text-muted-foreground" />
            {DEPT_FILTERS.map((df) => (
              <button
                key={`df-${df}`}
                onClick={() => setDeptFilter(df)}
                className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                  deptFilter === df
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {df}
              </button>
            ))}
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 border-l border-border pl-2">
            <button className="btn-ghost p-1" onClick={() => setZoom((z) => Math.min(z + 0.25, 2))} title="Zoom in">
              <ZoomIn size={14} />
            </button>
            <span className="text-xs text-muted-foreground font-mono-data w-8 text-center">{zoom}x</span>
            <button className="btn-ghost p-1" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))} title="Zoom out">
              <ZoomOut size={14} />
            </button>
          </div>

          {/* Export */}
          <button className="btn-ghost text-xs border-l border-border pl-2 ml-1" onClick={handleExport}>
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className="overflow-x-auto scrollbar-thin">
        <div style={{ minWidth: 900 * zoom }}>
          {/* Time axis header */}
          <div className="flex border-b border-border" style={{ paddingLeft: 140 }}>
            {axisLabels.map((label, i) => (
              <div
                key={`axis-${i}`}
                className="shrink-0 text-2xs text-muted-foreground font-mono-data border-l border-border/40 px-1 pt-1 pb-1"
                style={{ width: `${(1 / (axisLabels.length - 1)) * 100}%` }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="relative">
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none" style={{ paddingLeft: 140 }}>
              {axisLabels.slice(1).map((_, i) => (
                <div
                  key={`grid-${i}`}
                  className="absolute top-0 bottom-0 border-l border-border/20"
                  style={{ left: `calc(140px + ${((i + 1) / (axisLabels.length - 1)) * 100}%)` }}
                />
              ))}
              {showNowMarker && (
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-accent z-10"
                  style={{ left: `calc(140px + ${minutesToPct(nowMin)}%)` }}
                  title={`Now: ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`}
                />
              )}
            </div>

            {visibleRows.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                No segments match the selected filters.
              </div>
            ) : (
              visibleRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center border-b border-border/30 hover:bg-muted/20 transition-colors"
                  style={{ height: ROW_H }}
                >
                  <div className="shrink-0 flex items-center gap-1.5 px-3" style={{ width: 140 }}>
                    <span className="text-xs font-semibold text-foreground truncate">{row.name}</span>
                    <span
                      className={`text-2xs font-bold px-1 py-0.5 rounded ${
                        row.lineType === 'UP' ? 'bg-accent/15 text-accent' : 'bg-primary/15 text-primary'
                      }`}
                    >
                      {row.lineType}
                    </span>
                  </div>

                  <div className="relative flex-1" style={{ height: ROW_H }}>
                    {row.bars.map((bar) => {
                      const left = minutesToPct(bar.startMin);
                      const width = minutesToPct(bar.endMin - bar.startMin);
                      return (
                        <div
                          key={bar.id}
                          className={`absolute top-1/2 -translate-y-1/2 ${BAR_COLORS[bar.type]} flex items-center px-1.5 cursor-pointer transition-opacity hover:opacity-100`}
                          style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%`, height: 22 }}
                          onMouseEnter={(e) => setTooltip({ text: bar.tooltip, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <span className="text-2xs font-bold text-white truncate leading-none">{bar.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="px-4 py-2 border-t border-border flex items-center gap-2">
        <Info size={12} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {showNowMarker && (
            <>
              Current time:{' '}
              <span className="font-mono-data text-foreground">
                {now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false })} IST
              </span>{' '}
              ·{' '}
            </>
          )}
          Orange bars = maintenance blocks · Blue bars = train movements · Red bars = conflicts
        </span>
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-2 card-surface-elevated text-xs text-foreground shadow-lg pointer-events-none max-w-xs"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
