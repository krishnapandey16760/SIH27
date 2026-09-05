import React from 'react';
import { CheckCircle, AlertTriangle, Clock, XCircle, Zap } from 'lucide-react';

// Backend integration: GET /api/activity-feed?zone=NR&limit=8
const ACTIVITY = [
  { id: 'act-001', type: 'approved', text: 'Block Civil-044 approved', sub: 'NDLS–AGC UP · 04:00–08:00', time: '09:31' },
  { id: 'act-002', type: 'conflict', text: 'Conflict detected on GZB–ALD UP', sub: 'Train 12559 vs Civil-042', time: '09:28' },
  { id: 'act-003', type: 'approved', text: 'Block OHE-019 approved', sub: 'CNB–LKO DN · 18:00–20:00', time: '09:22' },
  { id: 'act-004', type: 'optimized', text: 'Optimization run converged', sub: 'Run run-20260905-001 · 94.2% score', time: '09:18' },
  { id: 'act-005', type: 'conflict', text: 'Conflict on MTJ–CNB DN resolved', sub: 'Block ST-010 rescheduled +45min', time: '09:15' },
  { id: 'act-006', type: 'pending', text: 'New request: Civil-045', sub: 'ALD–CNB UP · Critical priority', time: '09:10' },
  { id: 'act-007', type: 'approved', text: 'Block ST-009 approved', sub: 'CNB–LKO UP · 01:00–04:00', time: '08:55' },
  { id: 'act-008', type: 'cancelled', text: 'Block OHE-016 cancelled', sub: 'NDLS–GZB DN · Resource conflict', time: '08:40' },
];

const ICONS: Record<string, React.ReactNode> = {
  approved: <CheckCircle size={13} className="text-positive" />,
  conflict: <AlertTriangle size={13} className="text-negative" />,
  pending: <Clock size={13} className="text-warning" />,
  optimized: <Zap size={13} className="text-accent" />,
  cancelled: <XCircle size={13} className="text-muted-foreground" />,
};

export default function ActivityFeed() {
  return (
    <div className="card-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        <span className="text-2xs text-muted-foreground">Last 2h</span>
      </div>
      <div className="divide-y divide-border/40">
        {ACTIVITY.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted/20 transition-colors"
          >
            <div className="mt-0.5 shrink-0">{ICONS[item.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground leading-tight truncate">
                {item.text}
              </p>
              <p className="text-2xs text-muted-foreground mt-0.5 truncate">{item.sub}</p>
            </div>
            <span className="text-2xs text-muted-foreground font-mono-data shrink-0 mt-0.5">
              {item.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}