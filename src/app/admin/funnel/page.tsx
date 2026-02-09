'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Filter, ArrowDown, AlertTriangle, Store } from 'lucide-react';

interface FunnelStage {
  stage: string;
  count: number;
  pct: number;
  dropoff: number;
  dropoffPct: number;
}

interface StuckSalon {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

const FUNNEL_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-cyan-500',
  'bg-green-500', 'bg-yellow-500', 'bg-orange-500',
];

export default function FunnelPage() {
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [stuck, setStuck] = useState<{ onboarding: StuckSalon[]; masters: StuckSalon[]; bookings: StuckSalon[] }>({ onboarding: [], masters: [], bookings: [] });
  const [loading, setLoading] = useState(true);
  const [stuckTab, setStuckTab] = useState<'onboarding' | 'masters' | 'bookings'>('onboarding');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/onboarding-funnel');
      if (res.ok) {
        const data = await res.json();
        setFunnel(data.funnel);
        setStuck(data.stuck);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Filter className="w-6 h-6 text-violet-400" /> Воронка онбордінгу
          </h1>
          <p className="text-gray-400 text-sm">Шлях салону: реєстрація → активне використання</p>
        </div>
        <Button variant="outline" className="bg-[#12121a] border-white/10 text-gray-300" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Оновити
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <>
          {/* Visual funnel */}
          <Card className="bg-[#12121a] border-white/5 p-6">
            <div className="space-y-3">
              {funnel.map((stage, i) => (
                <div key={stage.stage}>
                  <div className="flex items-center gap-4 mb-1">
                    <span className="text-sm text-gray-300 w-48">{stage.stage}</span>
                    <div className="flex-1">
                      <div className="h-8 bg-white/5 rounded-lg overflow-hidden relative">
                        <div
                          className={`h-full ${FUNNEL_COLORS[i]} rounded-lg transition-all duration-500 flex items-center px-3`}
                          style={{ width: `${Math.max(stage.pct, 5)}%` }}
                        >
                          <span className="text-white text-xs font-bold whitespace-nowrap">
                            {stage.count} ({stage.pct}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Drop-off indicator */}
                  {stage.dropoff > 0 && (
                    <div className="flex items-center gap-4 ml-52 mb-1">
                      <ArrowDown className="w-3 h-3 text-red-400" />
                      <span className="text-xs text-red-400">
                        -{stage.dropoff} ({stage.dropoffPct}% відсів)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Conversion rate */}
            {funnel.length >= 2 && funnel[0].count > 0 && (
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-4">
                <span className="text-sm text-gray-400">Загальна конверсія (реєстрація → активний):</span>
                <span className="text-lg font-bold text-violet-400">
                  {funnel[funnel.length - 1].pct}%
                </span>
              </div>
            )}
          </Card>

          {/* Stuck salons */}
          <Card className="bg-[#12121a] border-white/5 p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" /> Застрягли на етапі
            </h2>

            <div className="flex gap-2 mb-4">
              {([
                ['onboarding', `Онбордінг (${stuck.onboarding.length})`],
                ['masters', `Без майстрів (${stuck.masters.length})`],
                ['bookings', `Без записів (${stuck.bookings.length})`],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStuckTab(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    stuckTab === key
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-[#0a0a0f] text-gray-400 border border-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {stuck[stuckTab].length === 0 ? (
              <p className="text-gray-500 text-sm py-4">Немає застряглих салонів 🎉</p>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {stuck[stuckTab].map(salon => (
                  <div key={salon.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0a0a0f] hover:bg-white/5">
                    <Store className="w-4 h-4 text-gray-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">{salon.name}</p>
                      <p className="text-xs text-gray-500">{salon.slug}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(salon.createdAt).toLocaleDateString('uk-UA')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
