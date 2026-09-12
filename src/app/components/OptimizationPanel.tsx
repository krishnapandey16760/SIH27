'use client';

import React, { useState } from 'react';
import { Cpu, Play, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { runFullOptimization } from '@/lib/runFullOptimization';
import type { ScheduledBlock } from '@/lib/solver';
import type { SolverEngine } from '@/lib/solverClient';

export default function OptimizationPanel() {
  const [expanded, setExpanded] = useState(true);
  const [running, setRunning] = useState(false);
  const [blocks, setBlocks] = useState<ScheduledBlock[] | null>(null);
  const [engine, setEngine] = useState<SolverEngine | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  const scheduled = blocks?.filter((b) => b.status !== 'Conflict').length ?? 0;
  const shifted = blocks?.filter((b) => b.status === 'Shifted').length ?? 0;
  const conflicts = blocks?.filter((b) => b.status === 'Conflict').length ?? 0;

  const handleRun = async (useGA: boolean) => {
    setRunning(true);
    try {
      const result = await runFullOptimization(useGA);
      setBlocks(result.blocks);
      setEngine(result.engine);
      setLastRunAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));

      if (result.engine === 'local-fallback') {
        toast.warning('Python solver unreachable — used local fallback heuristic', {
          description: 'Start the FastAPI backend (uvicorn main:app) for real MILP/GA results.',
        });
      } else {
        toast.success(`Solver run complete (${result.engine})`, {
          description: `${result.blocks.length - conflicts} scheduled, ${conflicts} unresolved conflicts`,
        });
      }
    } catch (err) {
      toast.error('Optimization run failed', { description: String(err) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="card-surface overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Optimization Engine</span>
          {engine && (
            <span
              className={`status-badge ${
                engine === 'local-fallback' ? 'bg-warning/15 text-warning' : 'bg-positive-tint text-positive'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {engine === 'python-milp-ga' ? 'OR-Tools + GA' : engine === 'python-milp' ? 'OR-Tools CP-SAT' : 'Local fallback'}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4 fade-in">
          {!blocks ? (
            <p className="text-xs text-muted-foreground">
              No run yet — click below to solve today's maintenance requests against real train movement
              data using the Python backend.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Last run: {lastRunAt}</span>
                <span>{blocks.length} requests processed</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/40 rounded-lg p-2.5">
                  <p className="text-2xs text-muted-foreground">Scheduled</p>
                  <p className="text-sm font-bold text-positive font-mono-data mt-0.5">{scheduled}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2.5">
                  <p className="text-2xs text-muted-foreground">Shifted</p>
                  <p className="text-sm font-bold text-warning font-mono-data mt-0.5">{shifted}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2.5">
                  <p className="text-2xs text-muted-foreground">Conflicts</p>
                  <p className="text-sm font-bold text-negative font-mono-data mt-0.5">{conflicts}</p>
                </div>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                {blocks.map((b) => (
                  <div key={b.requestId} className="flex items-center justify-between text-2xs">
                    <span className="font-mono-data text-foreground">{b.requestId}</span>
                    <span
                      className={
                        b.status === 'Conflict' ? 'text-negative' : b.status === 'Shifted' ? 'text-warning' : 'text-positive'
                      }
                    >
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button className="btn-primary flex-1 justify-center text-xs" onClick={() => handleRun(false)} disabled={running}>
              {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Run MILP
            </button>
            <button className="btn-secondary flex-1 justify-center text-xs" onClick={() => handleRun(true)} disabled={running}>
              {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Run MILP + GA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
