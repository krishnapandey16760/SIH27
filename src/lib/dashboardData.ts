import { seededRandom } from '@/context/DashboardContext';
import type { TimeRange } from '@/context/DashboardContext';

/* ---------------- Metrics ---------------- */

export interface MetricDef {
  id: string;
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  sub: string;
  variant: 'default' | 'positive' | 'warning' | 'alert';
}

export function generateMetrics(seed: number, timeRange: TimeRange): MetricDef[] {
  const rand = seededRandom(seed);
  const scale = timeRange === 'Daily' ? 1 : timeRange === 'Weekly' ? 7 : 30;
  const periodLabel = timeRange === 'Daily' ? 'yesterday' : timeRange === 'Weekly' ? 'last week' : 'last month';

  const utilization = +(60 + rand() * 30).toFixed(1);
  const delayHours = +((8 + rand() * 10) * (scale === 1 ? 1 : scale * 0.6)).toFixed(1);
  const fulfillment = +(78 + rand() * 18).toFixed(1);
  const conflicts = Math.max(0, Math.floor(rand() * 6 * (scale === 1 ? 1 : 1.5)));
  const segments = Math.floor(6 + rand() * 12);
  const mts = +(2 + rand() * 5).toFixed(1);
  const windowsUsed = Math.round((utilization / 100) * 60 * scale);

  return [
    {
      id: 'metric-utilization',
      label: 'Block Utilization Rate',
      value: `${utilization}%`,
      delta: `${rand() > 0.5 ? '+' : '-'}${(rand() * 4).toFixed(1)}% vs ${periodLabel}`,
      deltaPositive: rand() > 0.35,
      sub: `${windowsUsed} of ${60 * scale} available windows used`,
      variant: 'default',
    },
    {
      id: 'metric-delay',
      label: 'Train Delay Hours',
      value: `${delayHours}h`,
      delta: `${rand() > 0.5 ? '+' : '-'}${(rand() * 2).toFixed(1)}h vs ${periodLabel}`,
      deltaPositive: rand() > 0.5,
      sub: `MILP objective: minimize to <${10 * scale}h`,
      variant: 'warning',
    },
    {
      id: 'metric-fulfillment',
      label: 'Priority Fulfillment',
      value: `${fulfillment}%`,
      delta: `+${(rand() * 6).toFixed(1)}% this period`,
      deltaPositive: true,
      sub: `Critical: ${Math.round(90 + rand() * 10)}% · High: ${Math.round(78 + rand() * 15)}% · Med: ${Math.round(72 + rand() * 15)}%`,
      variant: 'positive',
    },
    {
      id: 'metric-conflicts',
      label: 'Active Conflicts',
      value: `${conflicts}`,
      delta: conflicts > 0 ? `${Math.min(conflicts, Math.ceil(conflicts / 2))} critical, ${Math.max(0, conflicts - Math.ceil(conflicts / 2))} high` : 'None open',
      deltaPositive: conflicts === 0,
      sub: 'Auto-detected via no-overlap constraint check',
      variant: conflicts > 2 ? 'alert' : conflicts > 0 ? 'warning' : 'default',
    },
    {
      id: 'metric-segments',
      label: 'Segments Under Maintenance',
      value: `${segments}`,
      delta: `${Math.floor(segments * 0.4)} Civil · ${Math.floor(segments * 0.3)} OHE · ${Math.ceil(segments * 0.3)} S&T`,
      deltaPositive: true,
      sub: 'Of 68 total NR track segments',
      variant: 'default',
    },
    {
      id: 'metric-mts',
      label: 'Mean Time to Schedule',
      value: `${mts}h`,
      delta: `${rand() > 0.5 ? '-' : '+'}${(rand() * 1).toFixed(1)}h vs ${periodLabel}`,
      deltaPositive: rand() > 0.5,
      sub: 'From request submission to approved block',
      variant: 'default',
    },
  ];
}

export function exportMetricsCSV(metrics: MetricDef[]): string {
  const header = 'Label,Value,Delta,Sub\n';
  const lines = metrics.map((m) => `"${m.label}","${m.value}","${m.delta}","${m.sub.replace(/"/g, '""')}"`);
  return header + lines.join('\n');
}

/* ---------------- Gantt schedule ---------------- */

export interface Bar {
  id: string;
  type: 'train' | 'block' | 'conflict';
  label: string;
  startMin: number;
  endMin: number;
  tooltip: string;
}

export interface SegmentRow {
  id: string;
  name: string;
  lineType: 'UP' | 'DOWN';
  bars: Bar[];
}

const SEGMENTS: { name: string; lineType: 'UP' | 'DOWN' }[] = [
  { name: 'NDLS–GZB', lineType: 'UP' },
  { name: 'NDLS–GZB', lineType: 'DOWN' },
  { name: 'GZB–ALD', lineType: 'UP' },
  { name: 'GZB–ALD', lineType: 'DOWN' },
  { name: 'ALD–CNB', lineType: 'UP' },
  { name: 'ALD–CNB', lineType: 'DOWN' },
  { name: 'CNB–LKO', lineType: 'UP' },
  { name: 'CNB–LKO', lineType: 'DOWN' },
  { name: 'NDLS–AGC', lineType: 'UP' },
  { name: 'MTJ–CNB', lineType: 'DOWN' },
];

const DEPTS = ['Civil', 'OHE', 'ST'];
const TRAIN_NUMS = ['12301', '12953', '14673', '12302', '22415', '12559', '12560', '12275', '14235', '12003', '22451', '12004', '12050', '12216'];

export function totalUnitsFor(timeRange: TimeRange) {
  if (timeRange === 'Daily') return 1440;
  if (timeRange === 'Weekly') return 7 * 1440;
  return 30 * 1440;
}

export function generateGantt(seed: number, timeRange: TimeRange): SegmentRow[] {
  const rand = seededRandom(seed);
  const total = totalUnitsFor(timeRange);
  const [minBars, maxBars] = timeRange === 'Daily' ? [2, 4] : timeRange === 'Weekly' ? [5, 10] : [12, 22];

  return SEGMENTS.map((seg, si) => {
    const bars: Bar[] = [];
    const numBars = Math.floor(minBars + rand() * (maxBars - minBars));

    for (let i = 0; i < numBars; i++) {
      const isBlock = rand() > 0.5;
      const start = Math.floor(rand() * total * 0.9);
      const dur = Math.floor(total * (0.015 + rand() * 0.06));
      const end = Math.min(start + dur, total);

      if (isBlock) {
        const dept = DEPTS[Math.floor(rand() * DEPTS.length)];
        bars.push({
          id: `seg${si}-blk-${i}`,
          type: 'block',
          label: `${dept}-${String(Math.floor(rand() * 90 + 10)).padStart(3, '0')}`,
          startMin: start,
          endMin: end,
          tooltip: `${dept} Dept · Maintenance block`,
        });
      } else {
        const num = TRAIN_NUMS[Math.floor(rand() * TRAIN_NUMS.length)];
        bars.push({
          id: `seg${si}-trn-${i}`,
          type: 'train',
          label: num,
          startMin: start,
          endMin: end,
          tooltip: `Train ${num}`,
        });
      }
    }

    if (rand() > 0.72 && bars.length >= 1) {
      const base = bars[0];
      bars.push({
        id: `seg${si}-conf`,
        type: 'conflict',
        label: '⚠ CONF',
        startMin: base.startMin,
        endMin: Math.min(base.startMin + Math.max(15, (base.endMin - base.startMin) * 0.35), total),
        tooltip: `Conflict detected on ${seg.name} ${seg.lineType}`,
      });
    }

    return { id: `seg-${si}-${seg.lineType}`, name: seg.name, lineType: seg.lineType, bars };
  });
}

export function exportGanttCSV(rows: SegmentRow[]): string {
  const header = 'Segment,Line,Type,Label,StartMin,EndMin,Tooltip\n';
  const lines = rows.flatMap((r) =>
    r.bars.map((b) => `"${r.name}","${r.lineType}","${b.type}","${b.label}",${b.startMin},${b.endMin},"${b.tooltip.replace(/"/g, '""')}"`)
  );
  return header + lines.join('\n');
}

/* ---------------- Optimization run ---------------- */

export interface OptimizationRun {
  id: string;
  startedAt: string;
  completedAt: string;
  status: string;
  milpScore: number;
  gaGenerations: number;
  delayReduction: string;
  conflictsResolved: number;
  blocksScheduled: number;
}

export function generateOptimizationRun(seed: number, now: Date): OptimizationRun {
  const rand = seededRandom(seed + 1); // offset so it differs slightly from metrics seed
  const milpScore = +(87 + rand() * 11).toFixed(1);
  const gaGenerations = Math.floor(80 + rand() * 160);
  const delayReduction = `${(1.2 + rand() * 3.5).toFixed(1)}h`;
  const conflictsResolved = Math.floor(1 + rand() * 6);
  const blocksScheduled = Math.floor(28 + rand() * 35);
  const started = new Date(now.getTime() - Math.floor(4 + rand() * 8) * 60000);

  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });

  return {
    id: `run-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(rand() * 900 + 100)}`,
    startedAt: fmt(started),
    completedAt: fmt(now),
    status: 'Converged',
    milpScore,
    gaGenerations,
    delayReduction,
    conflictsResolved,
    blocksScheduled,
  };
}
