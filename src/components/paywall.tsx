'use client';

import { X, Check, Crown, Zap, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string; // highlighted feature name
  currentPlan?: string;
}

const plans = [
  {
    id: 'pro',
    name: 'Pro',
    price: 299,
    icon: Zap,
    color: 'bg-blue-500',
    features: [
      'До 10 майстрів',
      'До 50 послуг',
      'Власний Telegram бот',
      'Аналітика та звіти',
      'Пріоритетна підтримка',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 499,
    icon: Building2,
    color: 'bg-purple-600',
    popular: true,
    features: [
      'Безліміт майстрів',
      'Безліміт послуг',
      'Власний Telegram бот',
      'Розширена аналітика',
      'Google Business інтеграція',
      'Email/SMS кампанії',
      'Пріоритетна підтримка',
    ],
  },
];

export function Paywall({ isOpen, onClose, feature, currentPlan = 'free' }: PaywallProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 z-10">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
            <Crown className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Розблокуйте більше можливостей</h2>
          {feature && (
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">{feature}</span> — доступно на платних тарифах
            </p>
          )}
        </div>

        {/* Plans */}
        <div className="px-6 pb-6 space-y-3">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                plan.popular ? 'border-purple-500 shadow-lg' : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-4 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ПОПУЛЯРНИЙ
                </span>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${plan.color} flex items-center justify-center`}>
                    <plan.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-xs text-gray-500">
                      <span className="text-lg font-bold text-gray-900">{plan.price}</span> грн/міс
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className={plan.popular ? 'bg-purple-600 hover:bg-purple-700' : ''}
                  onClick={() => {
                    // TODO: redirect to payment
                    window.open('https://t.me/eyesseeeveryone?text=Хочу підписку ' + plan.name, '_blank');
                  }}
                >
                  Обрати
                </Button>
              </div>

              <div className="space-y-1.5">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    <span className={feature && f.toLowerCase().includes(feature.toLowerCase()) ? 'font-semibold text-gray-900' : ''}>
                      {f}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Free tier note */}
          <p className="text-center text-xs text-gray-400 pt-2">
            Безкоштовний тариф: до 3 майстрів, 15 послуг, базові функції
          </p>
        </div>
      </div>
    </div>
  );
}
