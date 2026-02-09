'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BellRing, RefreshCw, Loader2, Mail, MessageCircle, CheckCircle, XCircle,
} from 'lucide-react';

interface NotifLog {
  id: string;
  salonId: string | null;
  channel: string;
  recipient: string;
  type: string;
  subject: string | null;
  body: string | null;
  status: string;
  error: string | null;
  createdAt: string;
}

interface Stats {
  last24h: { total: number; sent: number; failed: number };
  last7d: { total: number; sent: number; failed: number };
  byChannel: { channel: string; count: number }[];
  byType: { type: string; count: number }[];
}

const TYPE_LABELS: Record<string, string> = {
  reminder_24h: 'Нагадування 24г',
  reminder_2h: 'Нагадування 2г',
  booking_confirm: 'Підтвердження',
  review_request: 'Запит відгуку',
  broadcast: 'Broadcast',
  otp: 'OTP',
};

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  telegram: MessageCircle,
};

export default function NotificationsPage() {
  const [logs, setLogs] = useState<NotifLog[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '50' });
      if (channelFilter) params.set('channel', channelFilter);
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/admin/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setStats(data.stats);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [channelFilter, typeFilter, page]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BellRing className="w-6 h-6 text-violet-400" /> Центр сповіщень
          </h1>
          <p className="text-gray-400 text-sm">Усі відправлені повідомлення — email, telegram, sms</p>
        </div>
        <Button variant="outline" className="bg-[#12121a] border-white/10 text-gray-300" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Оновити
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <Card className="bg-[#12121a] border-white/5 p-4">
            <p className="text-xs text-gray-500">За 24г</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.last24h.total}</p>
            <p className="text-xs text-gray-500">{stats.last24h.sent} ✓ / {stats.last24h.failed} ✗</p>
          </Card>
          <Card className="bg-[#12121a] border-white/5 p-4">
            <p className="text-xs text-gray-500">За 7 днів</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.last7d.total}</p>
            <p className="text-xs text-gray-500">{stats.last7d.sent} ✓ / {stats.last7d.failed} ✗</p>
          </Card>
          <Card className="bg-[#12121a] border-white/5 p-4">
            <p className="text-xs text-gray-500">По каналах</p>
            <div className="flex gap-2 mt-2">
              {stats.byChannel.map(c => (
                <span key={c.channel} className="px-2 py-0.5 rounded text-xs bg-violet-500/20 text-violet-400">
                  {c.channel}: {c.count}
                </span>
              ))}
              {stats.byChannel.length === 0 && <span className="text-xs text-gray-500">—</span>}
            </div>
          </Card>
          <Card className="bg-[#12121a] border-white/5 p-4">
            <p className="text-xs text-gray-500">По типах</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {stats.byType.map(t => (
                <span key={t.type} className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                  {TYPE_LABELS[t.type] || t.type}: {t.count}
                </span>
              ))}
              {stats.byType.length === 0 && <span className="text-xs text-gray-500">—</span>}
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex gap-2">
          <span className="text-xs text-gray-500 self-center">Канал:</span>
          {['', 'telegram', 'email'].map(c => (
            <button
              key={c}
              onClick={() => { setChannelFilter(c); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                channelFilter === c ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-[#12121a] text-gray-400 border border-white/5'
              }`}
            >
              {c || 'Всі'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <span className="text-xs text-gray-500 self-center">Тип:</span>
          {['', 'reminder_24h', 'reminder_2h', 'booking_confirm', 'otp', 'broadcast'].map(t => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                typeFilter === t ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-[#12121a] text-gray-400 border border-white/5'
              }`}
            >
              {TYPE_LABELS[t] || t || 'Всі'}
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      <Card className="bg-[#12121a] border-white/5">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <BellRing className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            Немає сповіщень. Вони з&#39;являться коли система почне логувати.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400 text-xs uppercase">Час</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-xs uppercase">Канал</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-xs uppercase">Тип</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-xs uppercase">Отримувач</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-xs uppercase">Статус</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-xs uppercase">Помилка</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const ChannelIcon = CHANNEL_ICONS[log.channel] || BellRing;
                  return (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2.5 px-4 text-gray-500 text-xs">{new Date(log.createdAt).toLocaleString('uk-UA')}</td>
                      <td className="py-2.5 px-4">
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <ChannelIcon className="w-3.5 h-3.5" /> {log.channel}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                          {TYPE_LABELS[log.type] || log.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-300 text-xs font-mono">{log.recipient}</td>
                      <td className="py-2.5 px-4">
                        {log.status === 'sent' ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : log.status === 'failed' ? (
                          <XCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <span className="text-xs text-gray-400">{log.status}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-red-400 text-xs truncate max-w-[200px]">{log.error || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="bg-[#12121a] border-white/10 text-gray-300">←</Button>
          <span className="text-sm text-gray-400 self-center">{page} / {Math.ceil(total / 50)}</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)} className="bg-[#12121a] border-white/10 text-gray-300">→</Button>
        </div>
      )}
    </div>
  );
}
