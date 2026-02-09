'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Wifi, RefreshCw, Loader2, CheckCircle, XCircle, AlertTriangle, Globe,
} from 'lucide-react';

interface WebhookLogItem {
  id: string;
  service: string;
  direction: string;
  url: string | null;
  method: string | null;
  statusCode: number | null;
  error: string | null;
  durationMs: number | null;
  createdAt: string;
}

interface TelegramWebhook {
  url: string;
  pendingUpdateCount: number;
  lastErrorDate: string | null;
  lastErrorMessage: string | null;
  maxConnections: number;
}

export default function WebhooksPage() {
  const [logs, setLogs] = useState<WebhookLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [telegram, setTelegram] = useState<TelegramWebhook | null>(null);
  const [stats, setStats] = useState<{ total24h: number; errors24h: number; byService: { service: string; count: number }[] }>({ total24h: 0, errors24h: 0, byService: [] });
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (serviceFilter) params.set('service', serviceFilter);
      const res = await fetch(`/api/admin/webhooks?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setTelegram(data.telegramWebhook);
        setStats(data.stats);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [serviceFilter]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wifi className="w-6 h-6 text-violet-400" /> Webhook Monitor
          </h1>
          <p className="text-gray-400 text-sm">Статус вебхуків та історія запитів</p>
        </div>
        <Button variant="outline" className="bg-[#12121a] border-white/10 text-gray-300" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Оновити
        </Button>
      </div>

      {/* Telegram Webhook Status */}
      {telegram && (
        <Card className={`p-5 ${telegram.lastErrorMessage ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${telegram.lastErrorMessage ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
              {telegram.lastErrorMessage ? <XCircle className="w-6 h-6 text-red-400" /> : <CheckCircle className="w-6 h-6 text-green-400" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">Telegram Webhook</p>
              <p className="text-xs text-gray-400 font-mono">{telegram.url || 'Не налаштовано'}</p>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <p className="text-white font-bold">{telegram.pendingUpdateCount}</p>
                <p className="text-xs text-gray-500">В черзі</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold">{telegram.maxConnections || '—'}</p>
                <p className="text-xs text-gray-500">Підключень</p>
              </div>
            </div>
          </div>
          {telegram.lastErrorMessage && (
            <div className="mt-3 p-3 bg-red-500/10 rounded-lg">
              <p className="text-sm text-red-400">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                {telegram.lastErrorMessage}
              </p>
              {telegram.lastErrorDate && (
                <p className="text-xs text-red-400/60 mt-1">{new Date(telegram.lastErrorDate).toLocaleString('uk-UA')}</p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-[#12121a] border-white/5 p-4">
          <p className="text-xs text-gray-500">Запитів (24г)</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total24h}</p>
        </Card>
        <Card className={`p-4 ${stats.errors24h > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-[#12121a] border-white/5'}`}>
          <p className="text-xs text-gray-500">Помилок (24г)</p>
          <p className={`text-2xl font-bold mt-1 ${stats.errors24h > 0 ? 'text-red-400' : 'text-gray-400'}`}>{stats.errors24h}</p>
        </Card>
        <Card className="bg-[#12121a] border-white/5 p-4">
          <p className="text-xs text-gray-500">Сервіси</p>
          <div className="flex gap-2 mt-2">
            {stats.byService.map(s => (
              <span key={s.service} className="px-2 py-0.5 rounded text-xs bg-violet-500/20 text-violet-400">{s.service}: {s.count}</span>
            ))}
            {stats.byService.length === 0 && <span className="text-xs text-gray-500">Немає даних</span>}
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'telegram', 'resend', 'stripe'].map(s => (
          <button
            key={s}
            onClick={() => setServiceFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              serviceFilter === s ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-[#12121a] text-gray-400 border border-white/5'
            }`}
          >
            {s || 'Всі'}
          </button>
        ))}
      </div>

      {/* Logs */}
      <Card className="bg-[#12121a] border-white/5">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Globe className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            Немає webhook логів. Вони з'являться коли система почне логувати запити.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400 text-xs uppercase">Час</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-xs uppercase">Сервіс</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-xs uppercase">Напрямок</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-xs uppercase">Статус</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-xs uppercase">Тривалість</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-xs uppercase">Помилка</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2.5 px-4 text-gray-500 text-xs">{new Date(log.createdAt).toLocaleString('uk-UA')}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-xs bg-violet-500/20 text-violet-400">{log.service}</span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-400 text-xs">{log.direction}</td>
                    <td className="py-2.5 px-4">
                      {log.statusCode ? (
                        <span className={`text-xs font-mono ${log.statusCode < 400 ? 'text-green-400' : 'text-red-400'}`}>{log.statusCode}</span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-gray-400 text-xs">{log.durationMs ? `${log.durationMs}ms` : '—'}</td>
                    <td className="py-2.5 px-4 text-red-400 text-xs truncate max-w-[200px]">{log.error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
