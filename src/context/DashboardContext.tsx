'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type TimeRange = 'Daily' | 'Weekly' | 'Monthly';

interface DashboardContextValue {
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  timeRange: TimeRange;
  setTimeRange: (r: TimeRange) => void;
  now: Date;
  seed: number;
  runNonce: number;
  triggerRun: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

// Deterministic PRNG so the same date+range+run always produces the same
// numbers within a session, but changing any of them changes the output.
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function seededRandom(seed: number) {
  return mulberry32(seed);
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<TimeRange>('Daily');
  const [now, setNow] = useState<Date>(new Date());
  const [runNonce, setRunNonce] = useState(0);

  // Live clock — ticks every second so displayed time is always current.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const seed = hashStringToSeed(`${selectedDate.toDateString()}|${timeRange}|${runNonce}`);

  const triggerRun = () => setRunNonce((n) => n + 1);

  return (
    <DashboardContext.Provider
      value={{ selectedDate, setSelectedDate, timeRange, setTimeRange, now, seed, runNonce, triggerRun }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within a DashboardProvider');
  return ctx;
}
