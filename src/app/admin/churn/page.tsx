'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingDown, AlertTriangle, Users, Activity,
  RefreshCw, Loader2, Store, ChevronRight,
} from 'lucide-react';

interface Cohort {
  month: string;
  registered: number;
  active30: number;
  active60: number;
  active90: number;
  churned: number;
  retention30: number;
  retention60: number;
  retention90: number;
}

interface RiskSalon {
  id: string;
  name: string;
  slug: string;
  totalBookings: number;
  createdAt: string;
}

interface Summary {
  totalSalons: number;
  activeLast30: number;
  atRiskCount: number;
  churnedCount: number;
  overallRetention: number;
}

export default function ChurnPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [atRisk, setAtRisk] = useState<RiskSalon[]>([]);
  const [churned, setChurned] = useState<RiskSalon[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'cohorts' | 'atRisk' | 'churned'>('cohorts');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/churn');
      if (res.ok) {
        const data = await res.json();
        setCohorts(data.cohorts);
        setAtRisk(data.atRisk);
        setChurned(data.churned);
        setSummary(data.summary);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const retentionColor = (pct: number) =>
    pct >= 80 ? 'text-green-400 bg-green-500/20' :
    pct >= 50 ? 'text-yellow-400 bg-yellow-500/20' :
    pct >= 20 ? 'text-orange-400 bg-orange-500/20' :
    'text-red-400 bg-red-500/20';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-violet-400" /> Churn Analytics
          </h1>
          <p className="text-gray-400 text-sm">Retention когорти, ризик відтоку, churned салони</p>
        </div>
        <Button variant="outline" className="bg-[#12121a] border-white/10 text-gray-300" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Оновити
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <>
          {/* Summary KPIs */}
          {summary && (
            <div className="grid grid-cols-4 gap-4">
              <Card className="bg-[#12121a] border-white/5 p-4">
                <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-blue-400" /><span className="text-xs text-gray-500">Всього</span></div>
                <p className="text-2xl font-bold text-white">{summary.totalSalons}</p>
              </Card>
              <Card className="bg-[#12121a] border-white/5 p-4">
                <div className="flex items-center gap-2 mb-1"><Activity className="w-4 h-4 text-green-400" /><span className="text-xs text-gray-500">Активні (30д)</span></div>
                <p className="text-2xl font-bold text-green-400">{summary.activeLast30}</p>
              </Card>
              <Card className="bg-yellow-500/10 border-yellow-500/20 p-4">
                <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-yellow-400" /><span className="text-xs text-yellow-400">Під ризиком</span></div>
                <p className="text-2xl font-bold text-yellow-400">{summary.atRiskCount}</p>
              </Card>
              <Card className={`p-4 ${summary.churnedCount > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-[#12121a] border-white/5'}`}>
                <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-red-400" /><span className="text-xs text-gray-500">Churned</span></div>
                <p className={`text-2xl font-bold ${summary.churnedCount > 0 ? 'text-red-400' : 'text-gray-400'}`}>{summary.churnedCount}</p>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2">
            {([
              ['cohorts', 'Когорти'],
              ['atRisk', `Під ризиком (${atRisk.length})`],
              ['churned', `Churned (${churned.length})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === key ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-[#12121a] text-gray-400 border border-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Cohort table */}
          {tab === 'cohorts' && (
            <Card className="bg-[#12121a] border-white/5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 text-xs uppercase">Місяць</th>
                    <th className="text-center py-3 px-4 text-gray-400 text-xs uppercase">Зареєстровано</th>
                    <th className="text-center py-3 px-4 text-gray-400 text-xs uppercase">Ret. 30д</th>
                    <th className="text-center py-3 px-4 text-gray-400 text-xs uppercase">Ret. 60д</th>
                    <th className="text-center py-3 px-4 text-gray-400 text-xs uppercase">Ret. 90д</th>
                    <th className="text-center py-3 px-4 text-gray-400 text-xs uppercase">Churned</th>
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map(c => (
                    <tr key={c.month} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2.5 px-4 text-gray-300 font-medium">{c.month}</td>
                      <td className="py-2.5 px-4 text-center text-gray-400">{c.registered}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${retentionColor(c.retention30)}`}>{c.retention30}%</span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${retentionColor(c.retention60)}`}>{c.retention60}%</span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${retentionColor(c.retention90)}`}>{c.retention90}%</span>
                      </td>
                      <td className="py-2.5 px-4 text-center text-red-400">{c.churned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* At-risk / Churned lists */}
          {(tab === 'atRisk' || tab === 'churned') && (
            <Card className="bg-[#12121a] border-white/5 p-4">
              {(tab === 'atRisk' ? atRisk : churned).length === 0 ? (
                <p className="text-gray-500 text-center py-8">Немає салонів 🎉</p>
              ) : (
                <div className="space-y-1.5">
                  {(tab === 'atRisk' ? atRisk : churned).map(salon => (
                    <div key={salon.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0a0a0f] hover:bg-white/5">
                      <Store className={`w-4 h-4 ${tab === 'atRisk' ? 'text-yellow-400' : 'text-red-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200">{salon.name}</p>
                        <p className="text-xs text-gray-500">{salon.slug}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">{salon.totalBookings} записів</p>
                        <p className="text-xs text-gray-500">{new Date(salon.createdAt).toLocaleDateString('uk-UA')}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
