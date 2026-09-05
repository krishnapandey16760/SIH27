'use client';

import React, { useState } from 'react';
import { Filter, ZoomIn, ZoomOut, Info } from 'lucide-react';

// Backend integration: GET /api/gantt/data?date=2026-09-05&zone=NR&view=daily
// Returns: { segments, trainBars, maintenanceBlocks }

interface Bar {
  id: string;
  type: 'train' | 'block' | 'conflict';
  label: string;
  startMin: number; // minutes from midnight
  endMin: number;
  tooltip: string;
}

interface SegmentRow {
  id: string;
  name: string;
  lineType: 'UP' | 'DOWN';
  dept?: string;
  bars: Bar[];
}

const GANTT_DATA: SegmentRow[] = [
  {
    id: 'seg-ndls-gzb-up',
    name: 'NDLS–GZB',
    lineType: 'UP',
    bars: [
      { id: 'b1', type: 'train', label: '12301', startMin: 360, endMin: 420, tooltip: 'Howrah Rajdhani · Dep 06:00 · Arr 07:00' },
      { id: 'b2', type: 'train', label: '12953', startMin: 480, endMin: 530, tooltip: 'August Kranti Rajdhani · Dep 08:00' },
      { id: 'b3', type: 'block', label: 'Civil-041', startMin: 60, endMin: 240, tooltip: 'Civil Dept · Track renewal · 01:00–04:00' },
      { id: 'b4', type: 'train', label: '14673', startMin: 660, endMin: 710, tooltip: 'Jaynagar Express · Dep 11:00' },
    ],
  },
  {
    id: 'seg-ndls-gzb-dn',
    name: 'NDLS–GZB',
    lineType: 'DOWN',
    bars: [
      { id: 'b5', type: 'train', label: '12302', startMin: 300, endMin: 360, tooltip: 'Howrah Rajdhani · Dep 05:00' },
      { id: 'b6', type: 'block', label: 'OHE-017', startMin: 120, endMin: 270, tooltip: 'OHE Dept · Wire replacement · 02:00–04:30' },
      { id: 'b7', type: 'train', label: '22415', startMin: 540, endMin: 600, tooltip: 'Andhra Pradesh AC Exp · Dep 09:00' },
    ],
  },
  {
    id: 'seg-gzb-ald-up',
    name: 'GZB–ALD',
    lineType: 'UP',
    bars: [
      { id: 'b8', type: 'block', label: 'Civil-042', startMin: 180, endMin: 390, tooltip: 'Civil Dept · Ballast tamping · 03:00–06:30' },
      { id: 'b9', type: 'train', label: '12559', startMin: 420, endMin: 600, tooltip: 'Shiv Ganga Express · Dep 07:00' },
      { id: 'b10', type: 'conflict', label: '⚠ CONF', startMin: 380, endMin: 420, tooltip: 'CONFLICT: Block Civil-042 overlaps train 12559 at 06:20' },
    ],
  },
  {
    id: 'seg-gzb-ald-dn',
    name: 'GZB–ALD',
    lineType: 'DOWN',
    bars: [
      { id: 'b11', type: 'train', label: '12560', startMin: 240, endMin: 420, tooltip: 'Shiv Ganga Express · Arr 07:00' },
      { id: 'b12', type: 'block', label: 'ST-008', startMin: 720, endMin: 840, tooltip: 'S&T Dept · Signal cable · 12:00–14:00' },
    ],
  },
  {
    id: 'seg-ald-cnb-up',
    name: 'ALD–CNB',
    lineType: 'UP',
    bars: [
      { id: 'b13', type: 'block', label: 'OHE-018', startMin: 60, endMin: 180, tooltip: 'OHE Dept · Pantograph inspection · 01:00–03:00' },
      { id: 'b14', type: 'train', label: '12275', startMin: 300, endMin: 420, tooltip: 'Allahabad Duronto · Dep 05:00' },
      { id: 'b15', type: 'train', label: '14235', startMin: 600, endMin: 720, tooltip: 'Varanasi Express · Dep 10:00' },
    ],
  },
  {
    id: 'seg-ald-cnb-dn',
    name: 'ALD–CNB',
    lineType: 'DOWN',
    bars: [
      { id: 'b16', type: 'train', label: '12276', startMin: 180, endMin: 300, tooltip: 'Allahabad Duronto · Arr 05:00' },
      { id: 'b17', type: 'block', label: 'Civil-043', startMin: 480, endMin: 660, tooltip: 'Civil Dept · Weld joint repair · 08:00–11:00' },
    ],
  },
  {
    id: 'seg-cnb-lko-up',
    name: 'CNB–LKO',
    lineType: 'UP',
    bars: [
      { id: 'b18', type: 'train', label: '12003', startMin: 420, endMin: 510, tooltip: 'Lucknow Shatabdi · Dep 07:00' },
      { id: 'b19', type: 'block', label: 'ST-009', startMin: 60, endMin: 240, tooltip: 'S&T Dept · Axle counter · 01:00–04:00' },
      { id: 'b20', type: 'train', label: '22451', startMin: 720, endMin: 780, tooltip: 'CDG Rajdhani · Dep 12:00' },
    ],
  },
  {
    id: 'seg-cnb-lko-dn',
    name: 'CNB–LKO',
    lineType: 'DOWN',
    bars: [
      { id: 'b21', type: 'train', label: '12004', startMin: 900, endMin: 990, tooltip: 'Lucknow Shatabdi Return · Dep 15:00' },
      { id: 'b22', type: 'block', label: 'OHE-019', startMin: 1080, endMin: 1200, tooltip: 'OHE Dept · Stagger correction · 18:00–20:00' },
    ],
  },
  {
    id: 'seg-ndls-agc-up',
    name: 'NDLS–AGC',
    lineType: 'UP',
    bars: [
      { id: 'b23', type: 'conflict', label: '⚠ CONF', startMin: 300, endMin: 420, tooltip: 'CONFLICT: Maintenance block overlaps Gatimaan Exp 12050' },
      { id: 'b24', type: 'block', label: 'Civil-044', startMin: 240, endMin: 480, tooltip: 'Civil Dept · Track geometry correction · 04:00–08:00' },
      { id: 'b25', type: 'train', label: '12050', startMin: 360, endMin: 450, tooltip: 'Gatimaan Express · Dep 06:00' },
    ],
  },
  {
    id: 'seg-mtj-cnb-dn',
    name: 'MTJ–CNB',
    lineType: 'DOWN',
    bars: [
      { id: 'b26', type: 'conflict', label: '⚠ CONF', startMin: 540, endMin: 600, tooltip: 'CONFLICT: S&T block overlaps train 12216' },
      { id: 'b27', type: 'block', label: 'ST-010', startMin: 480, endMin: 660, tooltip: 'S&T Dept · IBS commissioning · 08:00–11:00' },
      { id: 'b28', type: 'train', label: '12216', startMin: 540, endMin: 660, tooltip: 'Garib Rath · Dep 09:00' },
    ],
  },
];

const HOURS = Array.from({ length: 25 }, (_, i) => i);
const TOTAL_MINS = 1440;
const ROW_H = 36;

function minutesToPct(min: number) {
  return (min / TOTAL_MINS) * 100;
}

const BAR_COLORS = {
  train: 'gantt-train-bar',
  block: 'gantt-block-bar',
  conflict: 'gantt-conflict-bar',
};

const DEPT_FILTERS = ['All', 'Civil', 'OHE', 'S&T'] as const;
const LINE_FILTERS = ['All', 'UP', 'DOWN'] as const;

export default function GanttChartSection() {
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [lineFilter, setLineFilter] = useState<string>('All');
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  const filtered = GANTT_DATA.filter((row) => {
    const lineOk = lineFilter === 'All' || row.lineType === lineFilter;
    const deptOk =
      deptFilter === 'All' ||
      row.bars.some(
        (b) => b.type === 'block' && b.label.toLowerCase().includes(deptFilter.toLowerCase())
      ) ||
      deptFilter === 'All';
    return lineOk && (deptFilter === 'All' ? true : deptOk || true);
  });

  const visibleRows = lineFilter === 'All' ? GANTT_DATA : GANTT_DATA.filter((r) => r.lineType === lineFilter);

  return (
    <div className="card-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Block Schedule — Gantt View</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            05 Sep 2026 · Northern Railways · 10 track segments
          </p>
        </div>
        <div className="flex items-center gap-2">
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
                  ? 'bg-accent/20 text-accent border border-accent/30' :'text-muted-foreground hover:text-foreground'
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
                    ? 'bg-primary/20 text-primary border border-primary/30' :'text-muted-foreground hover:text-foreground'
                }`}
              >
                {df}
              </button>
            ))}
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 border-l border-border pl-2">
            <button
              className="btn-ghost p-1"
              onClick={() => setZoom((z) => Math.min(z + 0.25, 2))}
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <span className="text-xs text-muted-foreground font-mono-data w-8 text-center">
              {zoom}x
            </span>
            <button
              className="btn-ghost p-1"
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="overflow-x-auto scrollbar-thin">
        <div style={{ minWidth: 900 * zoom }}>
          {/* Time axis header */}
          <div className="flex border-b border-border" style={{ paddingLeft: 140 }}>
            {HOURS.map((h) => (
              <div
                key={`hour-${h}`}
                className="shrink-0 text-2xs text-muted-foreground font-mono-data border-l border-border/40 px-1 pt-1 pb-1"
                style={{ width: `${(1 / 24) * 100}%` }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="relative">
            {/* Hour grid lines */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ paddingLeft: 140 }}
            >
              {HOURS.slice(1).map((h) => (
                <div
                  key={`grid-${h}`}
                  className="absolute top-0 bottom-0 border-l border-border/20"
                  style={{ left: `calc(140px + ${(h / 24) * 100}%)` }}
                />
              ))}
            </div>

            {visibleRows.map((row, ri) => (
              <div
                key={row.id}
                className="flex items-center border-b border-border/30 hover:bg-muted/20 transition-colors"
                style={{ height: ROW_H }}
              >
                {/* Segment label */}
                <div
                  className="shrink-0 flex items-center gap-1.5 px-3"
                  style={{ width: 140 }}
                >
                  <span className="text-xs font-semibold text-foreground truncate">
                    {row.name}
                  </span>
                  <span
                    className={`text-2xs font-bold px-1 py-0.5 rounded ${
                      row.lineType === 'UP' ?'bg-accent/15 text-accent' :'bg-primary/15 text-primary'
                    }`}
                  >
                    {row.lineType}
                  </span>
                </div>

                {/* Bar area */}
                <div className="relative flex-1" style={{ height: ROW_H }}>
                  {row.bars.map((bar) => {
                    const left = minutesToPct(bar.startMin);
                    const width = minutesToPct(bar.endMin - bar.startMin);
                    return (
                      <div
                        key={bar.id}
                        className={`absolute top-1/2 -translate-y-1/2 ${BAR_COLORS[bar.type]} flex items-center px-1.5 cursor-pointer transition-opacity hover:opacity-100`}
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(width, 1.5)}%`,
                          height: 22,
                        }}
                        onMouseEnter={(e) =>
                          setTooltip({
                            text: bar.tooltip,
                            x: e.clientX,
                            y: e.clientY,
                          })
                        }
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="text-2xs font-bold text-white truncate leading-none">
                          {bar.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current time indicator label */}
      <div className="px-4 py-2 border-t border-border flex items-center gap-2">
        <Info size={12} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Current time: <span className="font-mono-data text-foreground">09:34 IST</span> ·
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