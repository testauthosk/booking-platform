'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Ticket, Plus, Trash2, Loader2, RefreshCw, Copy, Check, X, Power,
} from 'lucide-react';

interface PromoItem {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  maxUses: number;
  usedCount: number;
  validFrom: string;
  validUntil: string | null;
  targetPlan: string | null;
  isActive: boolean;
}

export default function PromoPage() {
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, totalUses: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Create form
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('percent');
  const [newValue, setNewValue] = useState(20);
  const [newMaxUses, setNewMaxUses] = useState(0);
  const [newValidUntil, setNewValidUntil] = useState('');
  const [newPlan, setNewPlan] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/promo');
      if (res.ok) {
        const data = await res.json();
        setPromos(data.promos);
        setSummary(data.summary);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newCode.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode, description: newDesc || null, discountType: newType,
          discountValue: newValue, maxUses: newMaxUses,
          validUntil: newValidUntil || null, targetPlan: newPlan || null,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewCode(''); setNewDesc(''); setNewValue(20); setNewMaxUses(0);
        load();
      } else {
        const err = await res.json();
        alert(err.error || 'Помилка');
      }
    } catch { alert('Помилка'); }
    finally { setCreating(false); }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch('/api/admin/promo', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    load();
  };

  const deletePromo = async (id: string) => {
    if (!confirm('Видалити промокод?')) return;
    await fetch('/api/admin/promo', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const discountLabel = (p: PromoItem) => {
    if (p.discountType === 'percent') return `${p.discountValue}%`;
    if (p.discountType === 'fixed') return `${p.discountValue}₴`;
    if (p.discountType === 'trial_days') return `${p.discountValue} днів`;
    return String(p.discountValue);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Ticket className="w-6 h-6 text-violet-400" /> Промокоди
          </h1>
          <p className="text-gray-400 text-sm">{summary.active} активних · {summary.totalUses} використань</p>
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
            <h3 className="font-semibold text-white">Новий промокод</h3>
            <button onClick={() => setShowCreate(false)} className="text-gray-400"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="КОД (напр. WELCOME20)" className="bg-[#0a0a0f] border-white/10 text-white font-mono" />
            <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Опис" className="bg-[#0a0a0f] border-white/10 text-white" />
            <select value={newType} onChange={(e) => setNewType(e.target.value)} className="bg-[#0a0a0f] border border-white/10 rounded-lg px-3 text-sm text-gray-300">
              <option value="percent">% знижка</option>
              <option value="fixed">Фіксована ₴</option>
              <option value="trial_days">Trial дні</option>
            </select>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500">Значення</label>
              <Input type="number" value={newValue} onChange={(e) => setNewValue(parseInt(e.target.value) || 0)} className="bg-[#0a0a0f] border-white/10 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Макс. використань (0=∞)</label>
              <Input type="number" value={newMaxUses} onChange={(e) => setNewMaxUses(parseInt(e.target.value) || 0)} className="bg-[#0a0a0f] border-white/10 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Дійсний до</label>
              <Input type="date" value={newValidUntil} onChange={(e) => setNewValidUntil(e.target.value)} className="bg-[#0a0a0f] border-white/10 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Цільовий план</label>
              <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300">
                <option value="">Будь-який</option>
                <option value="pro">PRO</option>
                <option value="business">BUSINESS</option>
              </select>
            </div>
          </div>
          <Button onClick={create} disabled={creating || !newCode.trim()} className="bg-violet-600 hover:bg-violet-700 text-white">
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Створити
          </Button>
        </Card>
      )}

      {/* Promo list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : promos.length === 0 ? (
        <div className="py-12 text-center text-gray-500">Немає промокодів</div>
      ) : (
        <div className="space-y-2">
          {promos.map(p => (
            <Card key={p.id} className={`bg-[#12121a] border-white/5 p-4 flex items-center gap-4 ${!p.isActive ? 'opacity-50' : ''}`}>
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{p.code}</span>
                  <button onClick={() => copyCode(p.code)} className="text-gray-500 hover:text-gray-300">
                    {copied === p.code ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-violet-500/20 text-violet-400">
                    {discountLabel(p)}
                  </span>
                  {p.targetPlan && (
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">{p.targetPlan.toUpperCase()}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {p.description || 'Без опису'} · {p.usedCount}/{p.maxUses || '∞'} використань
                  {p.validUntil && ` · до ${new Date(p.validUntil).toLocaleDateString('uk-UA')}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className={`bg-transparent ${p.isActive ? 'border-green-500/20 text-green-400' : 'border-gray-500/20 text-gray-500'}`} onClick={() => toggleActive(p.id, p.isActive)}>
                  <Power className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="bg-transparent border-red-500/20 text-red-400" onClick={() => deletePromo(p.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
