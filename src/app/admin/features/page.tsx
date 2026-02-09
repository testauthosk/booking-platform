'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Zap, Plus, Trash2, Loader2, RefreshCw, X, ToggleLeft, ToggleRight, Users,
} from 'lucide-react';

interface Flag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  salonIds: string[];
  rolloutPct: number;
  updatedAt: string;
}

export default function FeaturesPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingSalons, setEditingSalons] = useState<string | null>(null);
  const [salonInput, setSalonInput] = useState('');

  // Create form
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/features');
      if (res.ok) {
        const data = await res.json();
        setFlags(data.flags);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newKey.trim() || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey, name: newName, description: newDesc || null }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewKey(''); setNewName(''); setNewDesc('');
        load();
      } else {
        const err = await res.json();
        alert(err.error || 'Помилка');
      }
    } catch { alert('Помилка'); }
    finally { setCreating(false); }
  };

  const toggle = async (flag: Flag) => {
    await fetch('/api/admin/features', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: flag.id, enabled: !flag.enabled }),
    });
    load();
  };

  const updateRollout = async (flag: Flag, pct: number) => {
    await fetch('/api/admin/features', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: flag.id, rolloutPct: pct }),
    });
    load();
  };

  const addSalon = async (flagId: string, currentIds: string[]) => {
    if (!salonInput.trim()) return;
    const newIds = [...currentIds, salonInput.trim()];
    await fetch('/api/admin/features', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: flagId, salonIds: newIds }),
    });
    setSalonInput('');
    load();
  };

  const removeSalon = async (flagId: string, currentIds: string[], removeId: string) => {
    const newIds = currentIds.filter(id => id !== removeId);
    await fetch('/api/admin/features', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: flagId, salonIds: newIds }),
    });
    load();
  };

  const deleteFlag = async (id: string) => {
    if (!confirm('Видалити feature flag?')) return;
    await fetch('/api/admin/features', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-violet-400" /> Feature Flags
          </h1>
          <p className="text-gray-400 text-sm">{flags.length} флагів · {flags.filter(f => f.enabled).length} активних</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-[#12121a] border-white/10 text-gray-300" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" /> Оновити
          </Button>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4 mr-2" /> Створити
          </Button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="bg-[#12121a] border-violet-500/30 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Новий Feature Flag</h3>
            <button onClick={() => setShowCreate(false)} className="text-gray-400"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input value={newKey} onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/\s/g, '_'))} placeholder="key (e.g. reviews)" className="bg-[#0a0a0f] border-white/10 text-white font-mono" />
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Назва" className="bg-[#0a0a0f] border-white/10 text-white" />
            <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Опис" className="bg-[#0a0a0f] border-white/10 text-white" />
          </div>
          <Button onClick={create} disabled={creating || !newKey.trim() || !newName.trim()} className="bg-violet-600 hover:bg-violet-700 text-white">
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Створити
          </Button>
        </Card>
      )}

      {/* Flags list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : flags.length === 0 ? (
        <div className="py-12 text-center text-gray-500">Немає feature flags</div>
      ) : (
        <div className="space-y-2">
          {flags.map(flag => (
            <Card key={flag.id} className="bg-[#12121a] border-white/5 p-4">
              <div className="flex items-center gap-4">
                {/* Toggle */}
                <button onClick={() => toggle(flag)} className="flex-shrink-0">
                  {flag.enabled ? (
                    <ToggleRight className="w-8 h-8 text-green-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-500" />
                  )}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-violet-400">{flag.key}</span>
                    <span className="text-white font-medium">{flag.name}</span>
                    {flag.salonIds.length > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {flag.salonIds.length}
                      </span>
                    )}
                  </div>
                  {flag.description && <p className="text-xs text-gray-500">{flag.description}</p>}
                </div>

                {/* Rollout */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Rollout:</span>
                  <select
                    value={flag.rolloutPct}
                    onChange={(e) => updateRollout(flag, parseInt(e.target.value))}
                    className="bg-[#0a0a0f] border border-white/10 rounded px-2 py-1 text-xs text-gray-300"
                  >
                    {[0, 10, 25, 50, 75, 100].map(p => (
                      <option key={p} value={p}>{p}%</option>
                    ))}
                  </select>
                </div>

                {/* Salon overrides */}
                <Button
                  variant="outline" size="sm"
                  className="bg-transparent border-white/10 text-gray-400"
                  onClick={() => setEditingSalons(editingSalons === flag.id ? null : flag.id)}
                >
                  <Users className="w-3.5 h-3.5 mr-1" /> Салони
                </Button>

                {/* Delete */}
                <Button variant="outline" size="sm" className="bg-transparent border-red-500/20 text-red-400" onClick={() => deleteFlag(flag.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Salon overrides panel */}
              {editingSalons === flag.id && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={salonInput}
                      onChange={(e) => setSalonInput(e.target.value)}
                      placeholder="Salon ID"
                      className="bg-[#0a0a0f] border-white/10 text-white text-sm flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && addSalon(flag.id, flag.salonIds)}
                    />
                    <Button size="sm" className="bg-violet-600 text-white" onClick={() => addSalon(flag.id, flag.salonIds)}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {flag.salonIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {flag.salonIds.map(sid => (
                        <span key={sid} className="px-2 py-1 bg-[#0a0a0f] border border-white/10 rounded text-xs text-gray-300 flex items-center gap-1.5">
                          {sid.substring(0, 8)}...
                          <button onClick={() => removeSalon(flag.id, flag.salonIds, sid)} className="text-red-400 hover:text-red-300">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Немає override салонів</p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
