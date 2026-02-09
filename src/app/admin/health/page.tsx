'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  HeartPulse, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, Loader2, ChevronDown, Users, Calendar,
  TrendingUp, Store, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

interface SalonHealth {
  salonId: string;
  salonName: string;
  slug: string;
  score: number;
  profile: number;
  team: number;
  activity: number;
  engagement: number;
  growth: number;
  risk: 'healthy' | 'warning' | 'critical';
  createdAt: string;
  lastBookingAt: string | null;
  bookingsLast30: number;
  mastersCount: number;
  clientsCount: number;
  onboardingCompleted: boolean;
}

interface Summary {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
  avgScore: number;
}

const RISK_COLORS = {
  healthy: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

const RISK_ICONS = {
  healthy: CheckCircle,
  warning: AlertTriangle,
  critical: XCircle,
};

const RISK_LABELS = {
  healthy: 'Здоровий',
  warning: 'Увага',
  critical: 'Критичний',
};

export default function HealthPage() {
  const [salons, setSalons] = useState<SalonHealth[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState('score');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: sortBy });
      if (riskFilter) params.set('risk', riskFilter);
      const res = await fetch(`/api/admin/health-scores?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSalons(data.salons);
        setSummary(data.summary);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [riskFilter, sortBy]);

  const ScoreBar = ({ value, max, label, color }: { value: number; max: number; label: string; color: string }) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-24">{label}</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-10 text-right">{value}/{max}</span>
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-violet-400" /> Здоров'я салонів
          </h1>
          <p className="text-gray-400 text-sm">Tenant Health Score — оцінка стану кожного салону</p>
        </div>
        <Button variant="outline" className="bg-[#12121a] border-white/10 text-gray-300" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Оновити
        </Button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-5 gap-3">
          <Card className="bg-[#12121a] border-white/5 p-4">
            <p className="text-xs text-gray-500 uppercase">Всього</p>
            <p className="text-2xl font-bold text-white mt-1">{summary.total}</p>
          </Card>
          <Card className="bg-[#12121a] border-white/5 p-4">
            <p className="text-xs text-gray-500 uppercase">Середній скор</p>
            <p className="text-2xl font-bold text-white mt-1">{summary.avgScore}<span className="text-sm text-gray-500">/100</span></p>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20 p-4 cursor-pointer" onClick={() => setRiskFilter(riskFilter === 'healthy' ? '' : 'healthy')}>
            <p className="text-xs text-green-400 uppercase">Здорові</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{summary.healthy}</p>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/20 p-4 cursor-pointer" onClick={() => setRiskFilter(riskFilter === 'warning' ? '' : 'warning')}>
            <p className="text-xs text-yellow-400 uppercase">Увага</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{summary.warning}</p>
          </Card>
          <Card className="bg-red-500/10 border-red-500/20 p-4 cursor-pointer" onClick={() => setRiskFilter(riskFilter === 'critical' ? '' : 'critical')}>
            <p className="text-xs text-red-400 uppercase">Критичні</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{summary.critical}</p>
          </Card>
        </div>
      )}

      {/* Sort */}
      <div className="flex gap-2">
        {[
          { key: 'score', label: 'За скором' },
          { key: 'activity', label: 'За активністю' },
          { key: 'created', label: 'За датою' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setSortBy(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              sortBy === s.key ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-[#12121a] text-gray-400 border border-white/5'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Salon list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : salons.length === 0 ? (
        <div className="py-12 text-center text-gray-500">Немає салонів</div>
      ) : (
        <div className="space-y-2">
          {salons.map(salon => {
            const rc = RISK_COLORS[salon.risk];
            const RiskIcon = RISK_ICONS[salon.risk];
            const isExpanded = expanded === salon.salonId;

            return (
              <Card
                key={salon.salonId}
                className={`bg-[#12121a] border-white/5 overflow-hidden cursor-pointer transition-all hover:bg-[#16162a]`}
                onClick={() => setExpanded(isExpanded ? null : salon.salonId)}
              >
                <div className="p-4 flex items-center gap-4">
                  {/* Score circle */}
                  <div className={`w-14 h-14 rounded-full ${rc.bg} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-lg font-bold ${rc.text}`}>{salon.score}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white truncate">{salon.salonName}</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rc.bg} ${rc.text}`}>
                        {RISK_LABELS[salon.risk]}
                      </span>
                      {!salon.onboardingCompleted && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400">
                          Онбордінг
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{salon.slug} · створено {new Date(salon.createdAt).toLocaleDateString('uk-UA')}</p>
                  </div>

                  {/* Quick stats */}
                  <div className="flex gap-6 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {salon.mastersCount}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {salon.bookingsLast30}
                    </div>
                    <div className="flex items-center gap-1">
                      <Store className="w-3.5 h-3.5" /> {salon.clientsCount}
                    </div>
                  </div>

                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded breakdown */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-2">
                    <ScoreBar value={salon.profile} max={25} label="Профіль" color="bg-blue-500" />
                    <ScoreBar value={salon.team} max={20} label="Команда" color="bg-purple-500" />
                    <ScoreBar value={salon.activity} max={30} label="Активність" color="bg-green-500" />
                    <ScoreBar value={salon.engagement} max={15} label="Залученість" color="bg-yellow-500" />
                    <ScoreBar value={salon.growth} max={10} label="Ріст" color="bg-cyan-500" />
                    <div className="flex gap-4 pt-2 text-xs text-gray-500">
                      <span>Останній запис: {salon.lastBookingAt ? new Date(salon.lastBookingAt).toLocaleDateString('uk-UA') : 'немає'}</span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
