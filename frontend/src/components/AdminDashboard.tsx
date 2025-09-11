import React, { useEffect, useState } from 'react';
import { Trash2, BarChart3, RefreshCw } from 'lucide-react';

interface Analytics {
  total_rooms: number;
  status_breakdown: Record<string, number>;
  total_players: number;
  average_players_per_room: number;
  finished_rooms: number;
}

interface AdminRoom {
  id: string;
  name: string;
  status: string;
  player_count: number;
  max_players: number;
  turn_time_limit: number;
  created_at: string;
  is_private?: boolean;
}

const ADMIN_STORAGE_KEY = 'bc_admin_basic';

function buildAuthHeader(): string | undefined {
  const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
  if (!stored) return undefined;
  return 'Basic ' + stored;
}

export const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credsNeeded, setCredsNeeded] = useState(!buildAuthHeader());
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(apiBase + '/admin/analytics/', { headers: { 'Authorization': buildAuthHeader() || '' }});
      if (res.status === 401) { setCredsNeeded(true); throw new Error('Unauthorized'); }
      if (!res.ok) throw new Error('Failed to load');
      setAnalytics(await res.json());
      const rRes = await fetch(apiBase + '/admin/rooms/', { headers: { 'Authorization': buildAuthHeader() || '' }});
      if (rRes.ok) {
        const rJson = await rRes.json();
        setRooms(rJson.rooms || []);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (!credsNeeded) load(); }, [credsNeeded]);

  const handleSetCreds = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const user = (form.elements.namedItem('adminUser') as HTMLInputElement).value.trim();
    const pass = (form.elements.namedItem('adminPass') as HTMLInputElement).value.trim();
    if (!user || !pass) return;
    const token = btoa(user + ':' + pass);
    localStorage.setItem(ADMIN_STORAGE_KEY, token);
    setCredsNeeded(false);
  };

  const forceDelete = async (roomId: string) => {
    if (!confirm('Force delete room?')) return;
    try {
      setLoading(true);
      const res = await fetch(apiBase + `/admin/rooms/${roomId}/delete/`, { method: 'DELETE', headers: { 'Authorization': buildAuthHeader() || '' }});
      if (!res.ok) throw new Error('Delete failed');
      await load();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  if (credsNeeded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
        <form onSubmit={handleSetCreds} className="bg-white p-6 rounded-xl shadow-brand w-full max-w-sm space-y-4 border border-neutral-200">
          <h1 className="text-xl font-bold">Admin Login</h1>
          <input name="adminUser" placeholder="Username" className="w-full px-3 py-2 border rounded" />
          <input name="adminPass" placeholder="Password" type="password" className="w-full px-3 py-2 border rounded" />
          <button type="submit" className="w-full bg-primary-900 text-white py-2 rounded font-medium">Enter</button>
          {error && <p className="text-sm text-primary-700">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6" /> Admin Dashboard</h1>
          <button onClick={load} disabled={loading} className="flex items-center gap-2 bg-primary-900 hover:bg-primary-800 text-white px-4 py-2 rounded shadow-brand disabled:opacity-50">
            <RefreshCw className={"w-4 h-4 " + (loading ? 'animate-spin' : '')} /> Refresh
          </button>
        </div>
        {error && <div className="bg-primary-50 border border-primary-200 p-3 rounded text-primary-800 text-sm">{error}</div>}
        {!analytics && !loading && <p className="text-secondary-600">No analytics loaded.</p>}
        {analytics && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border shadow-sm space-y-3">
              <h2 className="font-semibold text-secondary-900">Overview</h2>
              <ul className="text-sm text-secondary-700 space-y-1">
                <li>Total Rooms: <strong>{analytics.total_rooms}</strong></li>
                <li>Finished Rooms: <strong>{analytics.finished_rooms}</strong></li>
                <li>Total Players: <strong>{analytics.total_players}</strong></li>
                <li>Avg Players / Room: <strong>{analytics.average_players_per_room}</strong></li>
              </ul>
            </div>
            <div className="bg-white p-5 rounded-xl border shadow-sm space-y-3">
              <h2 className="font-semibold text-secondary-900">Status Breakdown</h2>
              <ul className="text-sm text-secondary-700 space-y-1">
                {Object.entries(analytics.status_breakdown).map(([s,c]) => (
                  <li key={s} className="flex justify-between"><span>{s}</span><span className="font-medium">{c}</span></li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {analytics && analytics.total_rooms > 0 && (
          <div className="bg-white p-5 rounded-xl border shadow-sm">
            <h2 className="font-semibold mb-3 text-secondary-900">Force Delete Room</h2>
            <p className="text-xs text-secondary-600 mb-2">Enter a room UUID to delete it.</p>
            <ForceDeleteForm onDelete={forceDelete} />
          </div>
        )}
        {rooms.length > 0 && (
          <div className="bg-white p-5 rounded-xl border shadow-sm">
            <h2 className="font-semibold mb-3 text-secondary-900">All Rooms</h2>
            <div className="overflow-x-auto -mx-2">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-secondary-600 border-b">
                    <th className="py-2 px-2">Name</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2">Players</th>
                    <th className="py-2 px-2">Turn</th>
                    <th className="py-2 px-2">Created</th>
                    <th className="py-2 px-2">Privacy</th>
                    <th className="py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(r => (
                    <tr key={r.id} className="border-b last:border-none">
                      <td className="py-2 px-2 font-medium">{r.name}</td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-1 rounded text-xs bg-neutral-100">{r.status}</span>
                      </td>
                      <td className="py-2 px-2">{r.player_count}/{r.max_players}</td>
                      <td className="py-2 px-2">{r.turn_time_limit}s</td>
                      <td className="py-2 px-2 whitespace-nowrap">{new Date(r.created_at).toLocaleTimeString()}</td>
                      <td className="py-2 px-2">{r.is_private ? 'Private' : 'Public'}</td>
                      <td className="py-2 px-2">
                        <button onClick={()=>forceDelete(r.id)} className="text-warning-700 hover:text-warning-900 flex items-center gap-1 text-xs">
                          <Trash2 className="w-3 h-3"/> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ForceDeleteForm: React.FC<{ onDelete: (id: string) => void }> = ({ onDelete }) => {
  const [id, setId] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (id.trim()) onDelete(id.trim()); }} className="flex gap-2">
      <input value={id} onChange={(e)=>setId(e.target.value)} placeholder="Room UUID" className="flex-1 px-3 py-2 border rounded" />
      <button type="submit" className="bg-warning-600 hover:bg-warning-700 text-white px-4 py-2 rounded flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button>
    </form>
  );
};

export default AdminDashboard;
