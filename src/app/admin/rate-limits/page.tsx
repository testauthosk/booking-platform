'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Gauge, RefreshCw, Loader2, Activity, Users, Store, Key, Calendar, Shield,
} from 'lucide-react';

interface RateLimitData {
  summary: {
    actionsLast1h: number;
    actionsLast24h: number;
    otpAttempts1h: number;
    failedOtps: number;
    bookingsCreated24h: number;
    avgPerHour: number;
  };
  topActors: { name: string; count: number }[];
  topSalons: { salonId: string; salonName: string; count: number }[];
  actionBreakdown: { action: string; count: number }[];
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Створення',
  UPDATE: 'Оновлення',
  DELETE: 'Видалення',
};

export default function RateLimitsPage() {
  const [data, setData] = useState<RateLimitData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/rate-limits');
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!data) return <div className="p-6 text-gray-500">Помилка</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gauge className="w-6 h-6 text-violet-400" /> API Activity
          </h1>
          <p className="text-gray-400 text-sm">Активність API, підозріла поведінка, навантаження</p>
        </div>
        <Button variant="outline" className="bg-[#12121a] border-white/10 text-gray-300" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Оновити
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-[#12121a] border-white/5 p-5">
          <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-blue-400" /><span className="text-xs text-gray-500">Дій за 1 годину</span></div>
          <p className="text-3xl font-bold text-white">{data.summary.actionsLast1h}</p>
          <p className="text-xs text-gray-500 mt-1">~{data.summary.avgPerHour}/год середнє</p>
        </Card>
        <Card className="bg-[#12121a] border-white/5 p-5">
          <div className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-green-400" /><span className="text-xs text-gray-500">Записів за 24г</span></div>
          <p className="text-3xl font-bold text-white">{data.summary.bookingsCreated24h}</p>
        </Card>
        <Card className={`p-5 ${data.summary.failedOtps > 5 ? 'bg-red-500/10 border-red-500/20' : 'bg-[#12121a] border-white/5'}`}>
          <div className="flex items-center gap-2 mb-2"><Key className="w-4 h-4 text-orange-400" /><span className="text-xs text-gray-500">OTP (1г) / Підозрілі</span></div>
          <p className="text-3xl font-bold text-white">
            {data.summary.otpAttempts1h}
            {data.summary.failedOtps > 0 && <span className="text-red-400 text-lg ml-2">⚠ {data.summary.failedOtps}</span>}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Top actors */}
        <Card className="bg-[#12121a] border-white/5 p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" /> Топ користувачі (1г)
          </h3>
          {data.topActors.length === 0 ? (
            <p className="text-sm text-gray-500">Немає активності</p>
          ) : (
            <div className="space-y-2">
              {data.topActors.map((a, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 truncate">{a.name}</span>
                  <span className={`text-sm font-bold ${a.count > 50 ? 'text-orange-400' : 'text-gray-400'}`}>{a.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top salons */}
        <Card className="bg-[#12121a] border-white/5 p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Store className="w-4 h-4 text-gray-400" /> Топ салони (24г)
          </h3>
          {data.topSalons.length === 0 ? (
            <p className="text-sm text-gray-500">Немає активності</p>
          ) : (
            <div className="space-y-2">
              {data.topSalons.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 truncate">{s.salonName}</span>
                  <span className="text-sm font-bold text-gray-400">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Action breakdown */}
        <Card className="bg-[#12121a] border-white/5 p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-400" /> Дії (24г)
          </h3>
          {data.actionBreakdown.length === 0 ? (
            <p className="text-sm text-gray-500">Немає дій</p>
          ) : (
            <div className="space-y-3">
              {data.actionBreakdown.map((a, i) => {
                const maxCount = Math.max(...data.actionBreakdown.map(x => x.count));
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300">{ACTION_LABELS[a.action] || a.action}</span>
                      <span className="text-sm font-bold text-gray-400">{a.count}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${(a.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
