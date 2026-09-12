'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Shield, User, Building2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [role, setRole] = useState('Sr. Section Engineer');
  const [division, setDivision] = useState('Delhi Division (DLI)');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user',
          title: 'User Login & Session Active',
          description: 'User authenticated via Northern Railway Central Portal. Division: ' + division,
          user: name.trim(),
          role: role,
          section: division,
          status: 'Completed'
        })
      });

      localStorage.setItem('rail_user', JSON.stringify({ name, role, division }));
      router.push('/activity-log');
    } catch (error) {
      console.error('Error logging in:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d131d] text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#161f2e] border border-zinc-800 p-8 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">RailBlock Portal Login</h1>
            <p className="text-xs text-zinc-400">Northern Railway Operational Network</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-zinc-500" size={16} />
              <input
                type="text"
                required
                placeholder="e.g. Rajiv Kumar / Amit Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0d131d] border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Designation / Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#0d131d] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
            >
              <option value="Sr. Section Engineer">Sr. Section Engineer (Permanent Way)</option>
              <option value="Traffic Controller">Chief / Section Traffic Controller</option>
              <option value="Signal Engineer">Signal &amp; Telecom Engineer</option>
              <option value="Traction Power Engineer">OHE / Traction Power Engineer</option>
              <option value="Station Master">Station Superintendent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Railway Division</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 text-zinc-500" size={16} />
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full bg-[#0d131d] border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
              >
                <option value="Delhi Division (DLI)">Delhi Division (DLI)</option>
                <option value="Ambala Division (UMB)">Ambala Division (UMB)</option>
                <option value="Moradabad Division (MB)">Moradabad Division (MB)</option>
                <option value="Lucknow NR (LKO)">Lucknow NR (LKO)</option>
                <option value="Firozpur Division (FZR)">Firozpur Division (FZR)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <LogIn size={16} />
            {loading ? 'Authenticating...' : 'Enter Console'}
          </button>
        </form>
      </div>
    </div>
  );
}