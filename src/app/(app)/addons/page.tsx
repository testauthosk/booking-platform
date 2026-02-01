'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CreditCard, Headphones, BarChart3, Star, Heart, Database } from 'lucide-react';

const addons = [
  { icon: CreditCard, label: 'Платежі', description: 'Отримуйте оплату від клієнтів онлайн та на місці' },
  { icon: Headphones, label: 'Преміум-підтримка', description: 'Підтримка наших досвідчених спеціалістів', badge: 'Пробна версія' },
  { icon: BarChart3, label: 'Прогнози', description: 'Додаткові звіти та унікальна аналітика' },
  { icon: Star, label: 'Google Ratings Boost', description: 'Збільшуйте відгуки в Google' },
  { icon: Heart, label: 'Лояльність клієнтів', description: 'Винагороджуйте клієнтів за повторні візити' },
  { icon: Database, label: "Роз'єм для передачі даних", description: 'Підключіть дані до зовнішніх систем' },
];

export default function AddonsPage() {
  return (
    <div className="p-6">
      <Button variant="ghost" className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Назад
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Надбудови</h1>
        <p className="text-muted-foreground">
          Підніміть свій бізнес на новий рівень з доповненнями
        </p>
      </div>

      <h2 className="font-medium mb-4">Доповнення</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {addons.map((addon) => (
          <Card key={addon.label} className="p-6">
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <addon.icon className="h-6 w-6 text-primary" />
                </div>
                {addon.badge && (
                  <span className="text-xs px-2 py-1 rounded-full border border-orange-500 text-orange-500">
                    {addon.badge}
                  </span>
                )}
              </div>
              <h3 className="font-medium mb-2">{addon.label}</h3>
              <p className="text-sm text-muted-foreground flex-1">{addon.description}</p>
              <Button variant="outline" className="mt-4 w-full">
                Переглянути
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
