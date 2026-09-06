'use client';

import React, { useState, useRef, useMemo } from 'react';
import { 
  Search, ZoomIn, ZoomOut, RotateCcw, Filter, 
  Train, AlertTriangle, ShieldCheck, Wrench, X, MapPin, Layers 
} from 'lucide-react';

interface Station {
  id: string;
  code: string;
  name: string;
  x: number; // percentage coordinate on map width
  y: number; // percentage coordinate on map height
  division: 'Delhi' | 'Ambala' | 'Firozpur' | 'Lucknow' | 'Moradabad';
  zone: string;
  activeBlocks: number;
  scheduledTrains: number;
  type: 'major' | 'junction' | 'regular';
}

interface Edge {
  id: string;
  from: string; // station id
  to: string;   // station id
  distanceKm: number;
  lineType: 'UP' | 'DOWN' | 'BOTH';
  status: 'clear' | 'block-active' | 'conflict' | 'maintenance-done';
  blockId?: string;
  dept?: 'Civil' | 'OHE' | 'S&T';
}

// Sample Northern Railway (NR) Mock Data for SIH demonstration
const INITIAL_STATIONS: Station[] = [
  { id: 'NDLS', code: 'NDLS', name: 'New Delhi', x: 35, y: 45, division: 'Delhi', zone: 'NR', activeBlocks: 0, scheduledTrains: 420, type: 'major' },
  { id: 'DLI', code: 'DLI', name: 'Old Delhi', x: 37, y: 42, division: 'Delhi', zone: 'NR', activeBlocks: 1, scheduledTrains: 310, type: 'major' },
  { id: 'UMB', code: 'UMB', name: 'Ambala Cantt', x: 30, y: 20, division: 'Ambala', zone: 'NR', activeBlocks: 0, scheduledTrains: 180, type: 'junction' },
  { id: 'LKO', code: 'LKO', name: 'Lucknow Charbagh', x: 75, y: 65, division: 'Lucknow', zone: 'NR', activeBlocks: 2, scheduledTrains: 250, type: 'major' },
  { id: 'MB', code: 'MB', name: 'Moradabad', x: 60, y: 45, division: 'Moradabad', zone: 'NR', activeBlocks: 0, scheduledTrains: 190, type: 'junction' },
  { id: 'FZR', code: 'FZR', name: 'Firozpur Cantt', x: 15, y: 15, division: 'Firozpur', zone: 'NR', activeBlocks: 1, scheduledTrains: 90, type: 'junction' },
  { id: 'JRC', code: 'JRC', name: 'Jalandhar City', x: 22, y: 18, division: 'Firozpur', zone: 'NR', activeBlocks: 0, scheduledTrains: 140, type: 'junction' },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1', from: 'NDLS', to: 'DLI', distanceKm: 6, lineType: 'BOTH', status: 'clear' },
  { id: 'e2', from: 'NDLS', to: 'MB', distanceKm: 165, lineType: 'UP', status: 'block-active', blockId: 'BLK-NR-402', dept: 'OHE' },
  { id: 'e3', from: 'DLI', to: 'UMB', distanceKm: 200, lineType: 'DOWN', status: 'clear' },
  { id: 'e4', from: 'UMB', to: 'JRC', distanceKm: 115, lineType: 'BOTH', status: 'maintenance-done', dept: 'Civil' },
  { id: 'e5', from: 'JRC', to: 'FZR', distanceKm: 85, lineType: 'UP', status: 'conflict', blockId: 'BLK-NR-410', dept: 'S&T' },
  { id: 'e6', from: 'NDLS', to: 'LKO', distanceKm: 512, lineType: 'BOTH', status: 'block-active', blockId: 'BLK-NR-415', dept: 'Civil' },
];

export default function NetworkGraphClient() {
  const [stations] = useState<Station[]>(INITIAL_STATIONS);
  const [edges] = useState<Edge[]>(INITIAL_EDGES);
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  // Zoom & Pan state
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Handle Pan start
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Zoom handlers
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.6));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Filtered stations based on search and division
  const filteredStations = useMemo(() => {
    return stations.filter(station => {
      const matchesDivision = selectedDivision === 'ALL' || station.division === selectedDivision;
      const matchesSearch = station.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            station.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDivision && matchesSearch;
    });
  }, [stations, selectedDivision, searchTerm]);

  // Helper to get edge color based on status
  const getEdgeColor = (status: Edge['status']) => {
    switch (status) {
      case 'clear': return '#10B981'; // Green
      case 'block-active': return '#EF4444'; // Red
      case 'conflict': return '#F59E0B'; // Amber
      case 'maintenance-done': return '#3B82F6'; // Blue
      default: return '#9CA3AF';
    }
  };

  return (
    <div className="relative w-full h-[85vh] bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 flex flex-col shadow-2xl">
      
      {/* Top Toolbar / Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/90 border-b border-slate-800 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600/20 text-red-400 rounded-lg border border-red-500/30">
            <Train className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-wide">NORTHERN RAILWAY LIVE TOPOLOGY</h2>
            <p className="text-xs text-slate-400">SIH 2026 Real-Time Track & Block Monitor</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search Station (e.g. NDLS)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-red-500 w-48"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select 
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Divisions</option>
              <option value="Delhi">Delhi</option>
              <option value="Ambala">Ambala</option>
              <option value="Firozpur">Firozpur</option>
              <option value="Lucknow">Lucknow</option>
              <option value="Moradabad">Moradabad</option>
            </select>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-lg p-1">
          <button onClick={handleZoomIn} className="p-1.5 hover:bg-slate-800 rounded text-slate-300 transition" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleZoomOut} className="p-1.5 hover:bg-slate-800 rounded text-slate-300 transition" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={handleReset} className="p-1.5 hover:bg-slate-800 rounded text-slate-300 transition" title="Reset View">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Map Canvas Area */}
      <div 
        ref={containerRef}
        className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div 
          className="absolute inset-0 transition-transform duration-75 ease-out origin-center"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` 
          }}
        >
          <svg className="w-full h-full min-h-[600px] min-w-[900px] absolute inset-0 pointer-events-none">
            {/* Render Network Edges (Railway Tracks) */}
            {edges.map(edge => {
              const fromSt = stations.find(s => s.id === edge.from);
              const toSt = stations.find(s => s.id === edge.to);
              if (!fromSt || !toSt) return null;

              return (
                <g key={edge.id}>
                  <line 
                    x1={`${fromSt.x}%`} 
                    y1={`${fromSt.y}%`} 
                    x2={`${toSt.x}%`} 
                    y2={`${toSt.y}%`} 
                    stroke={getEdgeColor(edge.status)} 
                    strokeWidth="3"
                    strokeDasharray={edge.status === 'block-active' ? '6 4' : 'none'}
                    className="transition-all"
                  />
                </g>
              );
            })}
          </svg>

          {/* Render Stations (Nodes) */}
          {stations.map(station => {
            const isVisible = filteredStations.some(s => s.id === station.id);
            if (!isVisible) return null;

            return (
              <div 
                key={station.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStation(station);
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto"
                style={{ left: `${station.x}%`, top: `${station.y}%` }}
              >
                <div className={`relative flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                  station.activeBlocks > 0 
                    ? 'bg-red-500 border-white shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse' 
                    : 'bg-slate-900 border-red-500 group-hover:scale-125 group-hover:bg-red-600'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                </div>
                <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap shadow-md">
                  {station.code}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Station Details Sliding Drawer / Modal */}
      {selectedStation && (
        <div className="absolute right-4 bottom-4 w-80 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl z-20 backdrop-blur-md animate-in fade-in slide-in-from-right-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" />
              <h3 className="font-bold text-sm">{selectedStation.name} ({selectedStation.code})</h3>
            </div>
            <button 
              onClick={() => setSelectedStation(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">Division:</span>
              <span className="font-medium text-slate-200">{selectedStation.division} Division</span>
            </div>
            <div className="flex justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">Station Type:</span>
              <span className="font-medium uppercase text-red-400">{selectedStation.type}</span>
            </div>
            <div className="flex justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">Active Blocks / Failures:</span>
              <span className={`font-bold ${selectedStation.activeBlocks > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {selectedStation.activeBlocks} Block(s)
              </span>
            </div>
            <div className="flex justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">Scheduled Daily Trains:</span>
              <span className="font-medium text-slate-200">{selectedStation.scheduledTrains} Trains</span>
            </div>
          </div>

          <button 
            onClick={() => alert(`Fetching live signal telemetry and interlocking status for ${selectedStation.name}...`)}
            className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-medium text-xs py-2 rounded-lg transition shadow-lg shadow-red-600/20"
          >
            Request Section Clear / Inspect Telemetry
          </button>
        </div>
      )}

      {/* Legend Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Clear Line</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Block Active</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Conflict Warning</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Maintenance Done</span>
        </div>
        <div>Drag to Pan • Scroll/Buttons to Zoom • Click Station for Details</div>
      </div>

    </div>
  );
}