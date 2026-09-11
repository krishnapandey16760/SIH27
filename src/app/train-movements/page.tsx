'use client';

import { useEffect, useState, useMemo } from 'react';

interface Stop {
  seq: number;
  stationCode: string;
  stationName: string;
  arrivalMin: number | null;
  departureMin: number | null;
  distance: number;
}

interface TrainData {
  trainNo: string;
  trainName: string;
  sourceStation: string;
  sourceStationName: string;
  destinationStation: string;
  destinationStationName: string;
  totalStops: number;
  route: Stop[];
}

export default function TrainMovementsPage() {
  const [trains, setTrains] = useState<TrainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTrain, setSelectedTrain] = useState<TrainData | null>(null);

  useEffect(() => {
    fetch('/api/timetable')
      .then((res) => res.json())
      .then((data) => {
        setTrains(data.trains || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, []);

  const filteredTrains = useMemo(() => {
    if (!search.trim()) return trains;
    const query = search.toLowerCase();
    return trains.filter(
      (t) =>
        t.trainNo.toLowerCase().includes(query) ||
        t.trainName.toLowerCase().includes(query) ||
        t.sourceStationName.toLowerCase().includes(query) ||
        t.destinationStationName.toLowerCase().includes(query)
    );
  }, [trains, search]);

  const formatTime = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return '--:--';
    const hrs = Math.floor(minutes / 60).toString().padStart(2, '0');
    const mins = (minutes % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}`;
  };

  return (
    <div className="p-6 space-y-6 text-gray-100 min-h-screen bg-[#0f172a]">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Northern Railway Train Movements</h1>
          <p className="text-sm text-gray-400">Total Unique NR Trains: {filteredTrains.length}</p>
        </div>
        
        {/* Search Bar */}
        <div className="w-full md:w-80">
          <input
            type="text"
            placeholder="Search by Train No, Name, or Station..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-amber-400 animate-pulse">
          Filtering & Loading Northern Railway Trains...
        </div>
      ) : filteredTrains.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No matching Northern Railway trains found.</div>
      ) : (
        /* Unique Trains Table */
        <div className="overflow-x-auto border border-gray-800 rounded-xl bg-gray-900 shadow">
          <table className="min-w-full divide-y divide-gray-800 text-sm text-left">
            <thead className="bg-gray-800/80 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 font-semibold">Train No</th>
                <th className="px-5 py-3 font-semibold">Train Name</th>
                <th className="px-5 py-3 font-semibold">Source</th>
                <th className="px-5 py-3 font-semibold">Destination</th>
                <th className="px-5 py-3 font-semibold text-center">Halts</th>
                <th className="px-5 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredTrains.map((train) => (
                <tr key={train.trainNo} className="hover:bg-gray-800/40 transition">
                  <td className="px-5 py-3.5 font-mono text-amber-400 font-semibold">{train.trainNo}</td>
                  <td className="px-5 py-3.5 text-white font-medium">{train.trainName}</td>
                  <td className="px-5 py-3.5 text-gray-300">{train.sourceStationName}</td>
                  <td className="px-5 py-3.5 text-gray-300">{train.destinationStationName}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="px-2.5 py-1 text-xs rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                      {train.totalStops} stops
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setSelectedTrain(train)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-md text-xs transition shadow-sm"
                    >
                      View Route
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Route Modal Popup */}
      {selectedTrain && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {selectedTrain.trainNo} - {selectedTrain.trainName}
                </h3>
                <p className="text-xs text-amber-400 mt-0.5">
                  Route: {selectedTrain.sourceStationName} ➔ {selectedTrain.destinationStationName}
                </p>
              </div>
              <button
                onClick={() => setSelectedTrain(null)}
                className="text-gray-400 hover:text-white text-xl font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <table className="min-w-full text-xs text-left divide-y divide-gray-800">
                <thead className="bg-gray-800/50 text-gray-400 sticky top-0 uppercase">
                  <tr>
                    <th className="px-3 py-2">Seq</th>
                    <th className="px-3 py-2">Station</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Arr</th>
                    <th className="px-3 py-2">Dep</th>
                    <th className="px-3 py-2 text-right">Dist (km)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {selectedTrain.route.map((st) => (
                    <tr key={st.seq} className="hover:bg-gray-800/30">
                      <td className="px-3 py-2 text-gray-500">{st.seq}</td>
                      <td className="px-3 py-2 font-medium text-white">{st.stationName}</td>
                      <td className="px-3 py-2 text-amber-400 font-mono">{st.stationCode}</td>
                      <td className="px-3 py-2 text-gray-300">{formatTime(st.arrivalMin)}</td>
                      <td className="px-3 py-2 text-gray-300">{formatTime(st.departureMin)}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{st.distance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setSelectedTrain(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}