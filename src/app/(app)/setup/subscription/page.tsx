// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Check, Crown, Zap, Building2 } from 'lucide-react';
import Link from 'next/link';

interface SubData {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '0 ₴',
    period: '',
    icon: Zap,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    features: [
      '1 мастер',
      '10 послуг',
      'Онлайн-запис',
      'Базові сповіщення',
      'Telegram-бот (спільний)',
    ],
    limits: [
      'Без аналітики',
      'Без SMS',
      'Без брендування',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '299 ₴',
    period: '/місяць',
    icon: Crown,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    popular: true,
    features: [
      'До 5 майстрів',
      'Необмежено послуг',
      'Повна аналітика та звіти',
      'SMS-сповіщення',
      'Кастомні теми',
      'Пріоритетна підтримка',
      'Google відгуки',
    ],
    limits: [
      'Без власного бота',
      'Без API доступу',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: '499 ₴',
    period: '/місяць',
    icon: Building2,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    features: [
      'Необмежено майстрів',
      'Необмежено послуг',
      'Повна аналітика',
      'SMS + Email + Telegram',
      'Власний Telegram-бот',
      'Smart pricing',
      'API та webhook',
      'Мультилокації',
      'Виділений менеджер',
    ],
    limits: [],
  },
];

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<SubData | null>(null);

  useEffect(() => {
    fetch('/api/subscription')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSub(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentPlan = sub?.plan || 'free';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/setup">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Підписка</h1>
          <p className="text-sm text-gray-500">Ваш поточний план та можливості</p>
        </div>
      </div>

      {/* Current plan badge */}
      <Card className="p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Поточний план</p>
          <p className="text-lg font-bold capitalize">{currentPlan}</p>
        </div>
        {sub?.currentPeriodEnd && (
          <p className="text-sm text-gray-500">
            Наступне списання: {new Date(sub.currentPeriodEnd).toLocaleDateString('uk-UA')}
          </p>
        )}
      </Card>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => {
          const isCurrent = plan.id === currentPlan;
          const Icon = plan.icon;

          return (
            <Card
              key={plan.id}
              className={`p-5 relative ${isCurrent ? `ring-2 ring-primary ${plan.border}` : ''}`}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-2 py-0.5 bg-yellow-400 text-yellow-900 rounded-full font-bold">
                  Популярний
                </span>
              )}

              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg ${plan.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${plan.color}`} />
                </div>
                <h3 className="font-semibold">{plan.name}</h3>
              </div>

              <div className="mb-4">
                <span className="text-2xl font-bold">{plan.price}</span>
                <span className="text-sm text-gray-500">{plan.period}</span>
              </div>

              <div className="space-y-2 mb-5">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
                {plan.limits.map(l => (
                  <div key={l} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0">—</span>
                    <span>{l}</span>
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  Ваш план
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => {
                    // TODO: integrate with payment
                    alert('Оплата буде доступна незабаром');
                  }}
                >
                  {plan.id === 'free' ? 'Перейти' : 'Обрати'}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
