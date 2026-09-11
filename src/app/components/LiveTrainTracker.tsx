'use client';

import React, { useMemo, useState } from 'react';
import { Train, RotateCcw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { solveSchedule, formatMin, type ScheduledBlock } from '@/lib/solver';
import { BASE_TRAINS, BASE_REQUESTS } from '@/lib/liveTrainData';

export default function LiveTrainTracker() {
  // delayMinutes per train, keyed by trainNumber. 0 = on time.
  const [delays, setDelays] = useState<Record<string, number>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const effectiveTrains = useMemo(
    () =>
      BASE_TRAINS.map((t) => {
        const d = delays[t.trainNumber] || 0;
        return { ...t, startMin: t.startMin + d, endMin: t.endMin + d };
      }),
    [delays]
  );

  const results: ScheduledBlock[] = useMemo(
    () => solveSchedule(effectiveTrains, BASE_REQUESTS),
    [effectiveTrains]
  );

  const resultFor = (requestId: string) => results.find((r) => r.requestId === requestId);

  const applyDelay = (trainNumber: string, trainName: string, requestId: string) => {
    const raw = inputs[trainNumber];
    const mins = parseInt(raw, 10);
    if (isNaN(mins) || mins < 0) {
      toast.error('Enter a valid delay in minutes');
      return;
    }

    const before = resultFor(requestId);
    setDelays((prev) => ({ ...prev, [trainNumber]: mins }));

    // Compute what the new result WILL be, to describe the change in the toast.
    const newTrains = BASE_TRAINS.map((t) =>
      t.trainNumber === trainNumber ? { ...t, startMin: t.startMin + mins, endMin: t.endMin + mins } : t
    );
    const after = solveSchedule(newTrains, BASE_REQUESTS).find((r) => r.requestId === requestId);

    if (after?.status === 'Conflict') {
      toast.error(`${trainName} delayed ${mins} min — ${requestId} could not be rescheduled`, {
        description: after.reason,
      });
    } else if (before && after && before.startMin !== after.startMin) {
      toast.success(`${trainName} delayed ${mins} min — ${requestId} auto-rescheduled`, {
        description: `${formatMin(before.startMin)}–${formatMin(before.endMin)} → ${formatMin(after.startMin)}–${formatMin(after.endMin)}`,
      });
    } else {
      toast.info(`${trainName} delayed ${mins} min — no conflict, ${requestId} unaffected`);
    }
  };

  const resetAll = () => {
    setDelays({});
    setInputs({});
    toast.info('All trains reset to on-time schedule');
  };

  const pairs = BASE_TRAINS.map((t, i) => ({ train: t, request: BASE_REQUESTS[i] }));

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Train size={14} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Live Train Tracker (Demo)</span>
        </div>
        <button className="btn-ghost text-xs" onClick={resetAll}>
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      <div className="divide-y divide-border/40">
        {pairs.map(({ train, request }) => {
          const delay = delays[train.trainNumber] || 0;
          const result = resultFor(request.id);
          const isConflict = result?.status === 'Conflict';
          const isShifted = result?.status === 'Shifted';

          return (
            <div key={train.trainNumber} className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {train.trainNumber} · {train.trainName}
                  </p>
                  <p className="text-2xs text-muted-foreground mt-0.5">
                    {train.segmentId} ({train.lineType}) · Normal: {formatMin(train.startMin)}–{formatMin(train.endMin)}
                    {delay > 0 && (
                      <span className="text-warning font-medium">
                        {' '}
                        → Delayed: {formatMin(train.startMin + delay)}–{formatMin(train.endMin + delay)}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Delay (min)"
                  value={inputs[train.trainNumber] ?? ''}
                  onChange={(e) => setInputs((prev) => ({ ...prev, [train.trainNumber]: e.target.value }))}
                  className="input-field text-xs w-28"
                />
                <button
                  className="btn-secondary text-xs"
                  onClick={() => applyDelay(train.trainNumber, train.trainName, request.id)}
                >
                  <Clock size={12} />
                  Apply Delay
                </button>
              </div>

              <div className="flex items-start gap-2 pt-1">
                {isConflict ? (
                  <AlertTriangle size={13} className="text-negative mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle size={13} className="text-positive mt-0.5 shrink-0" />
                )}
                <div className="text-xs">
                  <span className="font-semibold text-foreground">{request.id}</span>{' '}
                  <span className="text-muted-foreground">({request.dept} · {request.priority})</span>
                  {result && (
                    <p className={isConflict ? 'text-negative' : isShifted ? 'text-warning' : 'text-muted-foreground'}>
                      {isConflict
                        ? `Conflict — ${result.reason}`
                        : `Scheduled ${formatMin(result.startMin)}–${formatMin(result.endMin)}${isShifted ? ' (auto-shifted)' : ''}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
