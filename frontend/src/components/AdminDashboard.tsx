import React, { useEffect, useState } from 'react';
import { Trash2, BarChart3, RefreshCw, MessageSquare, Eye, Check, X } from 'lucide-react';

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

interface UserMessage {
  id: string;
  username: string;
  subject: string;
  message: string;
  message_type: string;
  message_type_display: string;
  status: string;
  status_display: string;
  created_at: string;
  reviewed_at?: string;
  admin_notes: string;
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
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [messageStats, setMessageStats] = useState({
    total_count: 0,
    pending_count: 0,
    reviewed_count: 0,
    resolved_count: 0
  });
  const [activeTab, setActiveTab] = useState<'analytics' | 'messages'>('analytics');
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
      
      const mRes = await fetch(apiBase + '/admin/messages/', { headers: { 'Authorization': buildAuthHeader() || '' }});
      if (mRes.ok) {
        const mJson = await mRes.json();
        setMessages(mJson.messages || []);
        setMessageStats({
          total_count: mJson.total_count || 0,
          pending_count: mJson.pending_count || 0,
          reviewed_count: mJson.reviewed_count || 0,
          resolved_count: mJson.resolved_count || 0
        });
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

  const updateMessageStatus = async (messageId: string, status: string) => {
    try {
      setLoading(true);
      const res = await fetch(apiBase + `/admin/messages/${messageId}/`, { 
        method: 'PATCH', 
        headers: { 
          'Authorization': buildAuthHeader() || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Update failed');
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6" /> Admin Dashboard</h1>
          <button onClick={load} disabled={loading} className="flex items-center gap-2 bg-primary-900 hover:bg-primary-800 text-white px-4 py-2 rounded shadow-brand disabled:opacity-50">
            <RefreshCw className={"w-4 h-4 " + (loading ? 'animate-spin' : '')} /> Refresh
          </button>
        </div>
        {error && <div className="bg-primary-50 border border-primary-200 p-3 rounded text-primary-800 text-sm">{error}</div>}
        
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'analytics' 
                  ? 'text-primary-700 border-b-2 border-primary-500 bg-primary-50' 
                  : 'text-secondary-600 hover:text-secondary-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Analytics & Rooms</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-6 py-4 font-medium transition-colors relative ${
                activeTab === 'messages' 
                  ? 'text-primary-700 border-b-2 border-primary-500 bg-primary-50' 
                  : 'text-secondary-600 hover:text-secondary-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>User Messages</span>
                {messageStats.pending_count > 0 && (
                  <span className="bg-warning-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                    {messageStats.pending_count}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Analytics Tab Content */}
        {activeTab === 'analytics' && (
          <>
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
          </>
        )}

        {/* Messages Tab Content */}
        {activeTab === 'messages' && (
          <>
            {/* Message Statistics */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
                <div className="text-2xl font-bold text-secondary-900">{messageStats.total_count}</div>
                <div className="text-sm text-secondary-600">Total Messages</div>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
                <div className="text-2xl font-bold text-warning-700">{messageStats.pending_count}</div>
                <div className="text-sm text-secondary-600">Pending Review</div>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
                <div className="text-2xl font-bold text-primary-700">{messageStats.reviewed_count}</div>
                <div className="text-sm text-secondary-600">Reviewed</div>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
                <div className="text-2xl font-bold text-success-700">{messageStats.resolved_count}</div>
                <div className="text-sm text-secondary-600">Resolved</div>
              </div>
            </div>

            {/* Messages List */}
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-5 border-b">
                <h2 className="font-semibold text-secondary-900">User Messages</h2>
                <p className="text-sm text-secondary-600 mt-1">Messages submitted by users for review</p>
              </div>
              <div className="divide-y">
                {messages.length === 0 ? (
                  <div className="p-8 text-center text-secondary-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
                    <p>No messages submitted yet</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-secondary-900">{msg.subject}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              msg.message_type === 'bug_report' ? 'bg-warning-100 text-warning-800' :
                              msg.message_type === 'feedback' ? 'bg-primary-100 text-primary-800' :
                              'bg-neutral-100 text-neutral-800'
                            }`}>
                              {msg.message_type_display}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              msg.status === 'pending' ? 'bg-warning-100 text-warning-800' :
                              msg.status === 'reviewed' ? 'bg-primary-100 text-primary-800' :
                              'bg-success-100 text-success-800'
                            }`}>
                              {msg.status_display}
                            </span>
                          </div>
                          <p className="text-sm text-secondary-600 mb-2">
                            From: <span className="font-medium">{msg.username}</span> • 
                            {new Date(msg.created_at).toLocaleString()}
                          </p>
                          <p className="text-secondary-700 mb-3">{msg.message}</p>
                          {msg.admin_notes && (
                            <div className="bg-neutral-50 border border-neutral-200 rounded p-3">
                              <p className="text-sm text-secondary-600 font-medium mb-1">Admin Notes:</p>
                              <p className="text-sm text-secondary-700">{msg.admin_notes}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2 ml-4">
                          {msg.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateMessageStatus(msg.id, 'reviewed')}
                                className="bg-primary-100 hover:bg-primary-200 text-primary-700 px-3 py-1 rounded text-xs font-medium transition-colors"
                                title="Mark as reviewed"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => updateMessageStatus(msg.id, 'resolved')}
                                className="bg-success-100 hover:bg-success-200 text-success-700 px-3 py-1 rounded text-xs font-medium transition-colors"
                                title="Mark as resolved"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {msg.status === 'reviewed' && (
                            <button
                              onClick={() => updateMessageStatus(msg.id, 'resolved')}
                              className="bg-success-100 hover:bg-success-200 text-success-700 px-3 py-1 rounded text-xs font-medium transition-colors"
                              title="Mark as resolved"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                          {msg.status !== 'pending' && (
                            <button
                              onClick={() => updateMessageStatus(msg.id, 'pending')}
                              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3 py-1 rounded text-xs font-medium transition-colors"
                              title="Mark as pending"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
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
