'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Search, RefreshCw, Wifi } from 'lucide-react';

function formatLastUpdated(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${day}/${month}/${year} ${time} IST`;
}

export default function Topbar() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lastUpdated = formatLastUpdated(now);

  return (
    <header
      className="h-[60px] shrink-0 flex items-center justify-between px-6 border-b border-border card-surface"
      style={{ position: 'sticky', top: 0, zIndex: 30 }}
    >
      {/* Search */}
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-3 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search stations, segments, requests… (⌘K)"
          className="input-field pl-8 text-sm"
          style={{ width: 280, fontSize: 13 }}
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wifi size={12} className="text-positive" />
          <span>Live</span>
        </div>

        {/* Last updated */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-l border-border pl-3">
          <RefreshCw size={11} />
          <span className="font-mono-data">{lastUpdated}</span>
        </div>

        {/* Notifications */}
        <button className="relative btn-ghost p-2">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-negative" />
        </button>

        {/* Zone badge */}
        <div className="px-2.5 py-1 rounded-md text-xs font-bold text-primary border border-primary/30 bg-primary/8">
          NR Zone
        </div>
      </div>
    </header>
  );
}