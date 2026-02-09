// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  DollarSign,
  BarChart3,
  Loader2,
  Minus,
} from 'lucide-react';

interface Metrics {
  totalRevenue: number;
  prevRevenue: number;
  revenueChange: number;
  totalBookings: number;
  prevTotalBookings: number;
  bookingsChange: number;
  completedBookings: number;
  avgCheck: number;
  uniqueClients: number;
}

interface ChartDay {
  date: string;
  revenue: number;
  bookings: number;
}

interface TopService {
  name: string;
  count: number;
  revenue: number;
}

interface MasterStat {
  id: string;
  name: string;
  bookings: number;
  revenue: number;
  workload: number;
}

function formatMoney(n: number): string {
  return n.toLocaleString('uk-UA');
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-400 text-xs flex items-center gap-0.5"><Minus className="w-3 h-3" /> 0%</span>;
  if (value > 0) return <span className="text-green-600 text-xs flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> +{value}%</span>;
  return <span className="text-red-500 text-xs flex items-center gap-0.5"><TrendingDown className="w-3 h-3" /> {value}%</span>;
}

function MiniChart({ data, dataKey }: { data: ChartDay[]; dataKey: 'revenue' | 'bookings' }) {
  if (data.length === 0) return null;
  const values = data.map(d => d[dataKey]);
  const max = Math.max(...values, 1);
  const barWidth = Math.max(2, Math.min(12, Math.floor(300 / data.length) - 1));

  return (
    <div className="flex items-end gap-[1px] h-[80px]">
      {data.map((d, i) => {
        const h = Math.max(2, (d[dataKey] / max) * 72);
        const isToday = d.date === new Date().toISOString().split('T')[0];
        return (
          <div
            key={i}
            className={`rounded-t-sm transition-all ${isToday ? 'bg-amber-400' : 'bg-gray-300'}`}
            style={{ width: `${barWidth}px`, height: `${h}px` }}
            title={`${d.date}: ${dataKey === 'revenue' ? formatMoney(d[dataKey]) + ' ₴' : d[dataKey]}`}
          />
        );
      })}
    </div>
  );
}

function WorkloadBar({ percent }: { percent: number }) {
  const color = percent > 80 ? 'bg-green-500' : percent > 50 ? 'bg-amber-400' : percent > 20 ? 'bg-blue-400' : 'bg-gray-300';
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [chart, setChart] = useState<ChartDay[]>([]);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const [masterStats, setMasterStats] = useState<MasterStat[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports?period=${period}`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics);
          setChart(data.chart);
          setTopServices(data.topServices);
          setMasterStats(data.masterStats);
        }
      } catch (e) {
        console.error('Load reports error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period]);

  const periodLabels = { week: 'Тиждень', month: 'Місяць', year: 'Рік' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl lg:text-2xl font-bold">Аналітика</h1>
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['week', 'month', 'year'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                period === p ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">Виручка</span>
              <ChangeIndicator value={metrics.revenueChange} />
            </div>
            <div className="text-2xl font-bold">{formatMoney(metrics.totalRevenue)} ₴</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">Записів</span>
              <ChangeIndicator value={metrics.bookingsChange} />
            </div>
            <div className="text-2xl font-bold">{metrics.totalBookings}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-gray-500 font-medium mb-2">Середній чек</div>
            <div className="text-2xl font-bold">{formatMoney(metrics.avgCheck)} ₴</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-gray-500 font-medium mb-2">Клієнтів</div>
            <div className="text-2xl font-bold">{metrics.uniqueClients}</div>
          </Card>
        </div>
      )}

      {/* Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Виручка по днях</h3>
          <MiniChart data={chart} dataKey="revenue" />
          <div className="flex justify-between mt-2 text-[10px] text-gray-400">
            <span>{chart[0]?.date?.slice(5)}</span>
            <span>{chart[chart.length - 1]?.date?.slice(5)}</span>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Записи по днях</h3>
          <MiniChart data={chart} dataKey="bookings" />
          <div className="flex justify-between mt-2 text-[10px] text-gray-400">
            <span>{chart[0]?.date?.slice(5)}</span>
            <span>{chart[chart.length - 1]?.date?.slice(5)}</span>
          </div>
        </Card>
      </div>

      {/* Top services + Master workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top services */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Топ послуги</h3>
          {topServices.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Немає даних</p>
          ) : (
            <div className="space-y-3">
              {topServices.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                    <span className="text-sm font-medium truncate">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-400">{s.count} разів</span>
                    <span className="text-sm font-semibold">{formatMoney(s.revenue)} ₴</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Master workload */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Завантаженість майстрів</h3>
          {masterStats.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Немає даних</p>
          ) : (
            <div className="space-y-4">
              {masterStats.map(m => (
                <div key={m.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{m.name}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{m.bookings} зап.</span>
                      <span className="font-semibold text-gray-700">{formatMoney(m.revenue)} ₴</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <WorkloadBar percent={m.workload} />
                    <span className="text-xs text-gray-500 w-8 text-right">{m.workload}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
