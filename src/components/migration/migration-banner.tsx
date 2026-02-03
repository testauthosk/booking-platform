'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, ArrowRight, Gift, Check } from 'lucide-react';

// Преимущества перед конкурентами
const competitorAdvantages: Record<string, { name: string; advantages: string[] }> = {
  altegio: {
    name: 'Altegio / YCLIENTS',
    advantages: [
      'Без щомісячної абонплати',
      'Телеграм нагадування безкоштовно',
      'Повний контроль над базою клієнтів',
      'Простіший інтерфейс для майстрів',
    ],
  },
  booksy: {
    name: 'Booksy',
    advantages: [
      'Без комісії з кожного запису',
      'Ваші клієнти — ваші назавжди',
      'Телеграм замість SMS (дешевше)',
      'Необмежена кількість майстрів',
    ],
  },
  fresha: {
    name: 'Fresha',
    advantages: [
      'Без комісії за нових клієнтів',
      'Повна кастомізація бренду',
      'Інтеграція з українськими сервісами',
      'Підтримка українською 24/7',
    ],
  },
  calendly: {
    name: 'Calendly',
    advantages: [
      'Створений спеціально для салонів',
      'Управління командою майстрів',
      'Облік товарів та матеріалів',
      'Детальна аналітика по послугах',
    ],
  },
  square: {
    name: 'Square',
    advantages: [
      'Локалізація для України',
      'Телеграм нагадування',
      'Простіше налаштування',
      'Без прихованих комісій',
    ],
  },
  mindbody: {
    name: 'Mindbody',
    advantages: [
      'В 10 разів дешевше',
      'Простіший інтерфейс',
      'Не потребує навчання',
      'Швидка підтримка українською',
    ],
  },
  vagaro: {
    name: 'Vagaro',
    advantages: [
      'Підтримка української мови',
      'Телеграм інтеграція',
      'Локальні способи оплати',
      'Безкоштовні SMS альтернативи',
    ],
  },
  setmore: {
    name: 'Setmore',
    advantages: [
      'Більше функцій безкоштовно',
      'Облік складу та товарів',
      'Детальні звіти по майстрах',
      'Управління знижками',
    ],
  },
  timely: {
    name: 'Timely',
    advantages: [
      'Доступніша ціна',
      'Телеграм нагадування',
      'Український інтерфейс',
      'Локальна підтримка',
    ],
  },
  treatwell: {
    name: 'Treatwell',
    advantages: [
      'Без комісії з бронювань',
      'Ваша база — ваша власність',
      'Повний контроль над цінами',
      'Прямий зв\'язок з клієнтами',
    ],
  },
  salonIris: {
    name: 'Salon Iris',
    advantages: [
      'Сучасний мобільний інтерфейс',
      'Хмарне рішення (без серверів)',
      'Автоматичні бекапи',
      'Простіше оновлення',
    ],
  },
  other: {
    name: 'іншої системи',
    advantages: [
      'Сучасний зручний інтерфейс',
      'Телеграм нагадування безкоштовно',
      'Без прихованих комісій',
      'Підтримка українською',
    ],
  },
};

interface MigrationBannerProps {
  previousPlatform: string;
  clientsCount: number;
  onStartMigration: () => void;
  onDismiss: () => void;
}

export function MigrationBanner({ 
  previousPlatform, 
  clientsCount,
  onStartMigration,
  onDismiss 
}: MigrationBannerProps) {
  const [isDismissing, setIsDismissing] = useState(false);

  const competitor = competitorAdvantages[previousPlatform] || competitorAdvantages.other;

  const handleDismiss = async () => {
    setIsDismissing(true);
    await onDismiss();
  };

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 mb-6">
      {/* Dismiss button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
        disabled={isDismissing}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="p-4 lg:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              Перенесіть клієнтів з {competitor.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              Безкоштовна міграція — ми допоможемо перенести всі дані
            </p>
          </div>
        </div>

        {/* Advantages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {competitor.advantages.map((advantage, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 shrink-0" />
              <span>{advantage}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={onStartMigration} className="gap-2">
            Перенести клієнтів
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={handleDismiss} disabled={isDismissing}>
            Пізніше
          </Button>
        </div>

        {clientsCount > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            Зараз у вас {clientsCount} клієнтів. Імпорт додасть нових без дублювання.
          </p>
        )}
      </div>
    </Card>
  );
}
