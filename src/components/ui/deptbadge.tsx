import React from 'react';

type Dept = 'Civil' | 'OHE' | 'S&T';

const DEPT_CONFIG: Record<Dept, string> = {
  Civil: 'badge-civil',
  OHE: 'badge-ohe',
  'S&T': 'badge-st',
};

export default function DeptBadge({ dept }: { dept: Dept }) {
  const cls = DEPT_CONFIG[dept] ?? 'badge-st';
  return <span className={`status-badge ${cls}`}>{dept}</span>;
}