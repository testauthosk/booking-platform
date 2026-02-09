'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign, TrendingUp, Users, RefreshCw, Loader2,
  ArrowUpRight, ArrowDownRight, BarChart2, Percent,
} from 'lucide-react';

interface RevenueData {
  mrr: number;
  arpu: number;
  ltv: number;
  churnRate: number;
  totalSalons: number;
  activePaid: number;
  planBreakdown: Record<string, { count: number; revenue: number }>;
  mrrHistory: { month: string; mrr: number; salons: number }[];
  salonsWithoutSubscription: number;
  recentChanges: { id: string; actorName: string; entityName: string; changes: unknown; createdAt: string }[];
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/revenue');
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!data) return <div className="p-6 text-gray-500">Помилка завантаження</div>;

  const maxMrr = Math.max(...data.mrrHistory.map(h => h.mrr), 1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-violet-400" /> Дохід платформи
          </h1>
          <p className="text-gray-400 text-sm">MRR, ARPU, LTV, Churn</p>
        </div>
        <Button variant="outline" className="bg-[#12121a] border-white/10 text-gray-300" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Оновити
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20 p-5">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-violet-400" />
            <span className="text-xs text-violet-400 font-medium">MRR</span>
          </div>
          <p className="text-3xl font-bold text-white">{data.mrr.toLocaleString()} ₴</p>
          <p className="text-xs text-gray-400 mt-1">Monthly Recurring Revenue</p>
        </Card>

        <Card className="bg-[#12121a] border-white/5 p-5">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-blue-400 font-medium">ARPU</span>
          </div>
          <p className="text-3xl font-bold text-white">{data.arpu} ₴</p>
          <p className="text-xs text-gray-400 mt-1">Avg Revenue Per User</p>
        </Card>

        <Card className="bg-[#12121a] border-white/5 p-5">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-xs text-green-400 font-medium">LTV</span>
          </div>
          <p className="text-3xl font-bold text-white">{data.ltv.toLocaleString()} ₴</p>
          <p className="text-xs text-gray-400 mt-1">Lifetime Value</p>
        </Card>

        <Card className={`border p-5 ${data.churnRate > 10 ? 'bg-red-500/10 border-red-500/20' : 'bg-[#12121a] border-white/5'}`}>
          <div className="flex items-center justify-between mb-2">
            <Percent className="w-5 h-5 text-orange-400" />
            <span className="text-xs text-orange-400 font-medium">Churn</span>
          </div>
          <p className="text-3xl font-bold text-white">{data.churnRate}%</p>
          <p className="text-xs text-gray-400 mt-1">за останні 30 днів</p>
        </Card>
      </div>

      {/* MRR Chart + Plan breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {/* MRR History bar chart */}
        <Card className="bg-[#12121a] border-white/5 p-5 col-span-2">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-gray-400" /> MRR за 6 місяців
          </h3>
          <div className="flex items-end gap-3 h-40">
            {data.mrrHistory.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-400">{h.mrr.toLocaleString()}₴</span>
                <div
                  className="w-full bg-violet-500/80 rounded-t-lg transition-all duration-500 min-h-[4px]"
                  style={{ height: `${(h.mrr / maxMrr) * 120}px` }}
                />
                <span className="text-[10px] text-gray-500">{h.month}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Plan breakdown */}
        <Card className="bg-[#12121a] border-white/5 p-5">
          <h3 className="font-semibold text-white mb-4">Плани</h3>
          <div className="space-y-4">
            {Object.entries(data.planBreakdown).map(([plan, info]) => (
              <div key={plan}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    plan === 'business' ? 'text-amber-400' : plan === 'pro' ? 'text-violet-400' : 'text-gray-400'
                  }`}>
                    {plan.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-400">{info.count} салонів</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden mr-3">
                    <div
                      className={`h-full rounded-full ${
                        plan === 'business' ? 'bg-amber-500' : plan === 'pro' ? 'bg-violet-500' : 'bg-gray-600'
                      }`}
                      style={{ width: `${data.totalSalons > 0 ? (info.count / data.totalSalons) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{info.revenue}₴</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Без підписки</span>
              <span className="text-orange-400 font-medium">{data.salonsWithoutSubscription}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Оплачують</span>
              <span className="text-green-400 font-medium">{data.activePaid}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
