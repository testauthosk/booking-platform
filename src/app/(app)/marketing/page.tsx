'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, ArrowLeft } from 'lucide-react';

export default function MarketingPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button variant="ghost" className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Назад
      </Button>

      <h1 className="text-3xl font-bold mb-4">
        Просувайте свій бізнес за допомогою масових розсилок
      </h1>
      <p className="text-muted-foreground mb-8">
        Збільшуйте кількість бронювань та взаємодійте з клієнтами, ділячись 
        спеціальними пропозиціями та важливими новинами через email та SMS.
      </p>

      <div className="space-y-4 mb-8">
        {[
          'Персоналізуйте вміст повідомлень відповідно до вашого стилю',
          'Націлюйтесь на всіх клієнтів, окремі групи або окремих осіб',
          'Отримуйте доступ до потужної аналітики кампаній в режимі реального часу',
        ].map((feature, i) => (
          <div key={i} className="flex items-start gap-3">
            <Check className="h-5 w-5 text-primary mt-0.5" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Button variant="outline">Детальніше</Button>
        <Button>Почати</Button>
      </div>

      <Card className="mt-8 p-8 flex items-center justify-center">
        <img 
          src="/marketing-hero.png" 
          alt="Marketing" 
          className="max-w-full h-auto"
          onError={(e) => {
            e.currentTarget.src = 'https://placehold.co/400x300/f3f4f6/a1a1aa?text=Marketing';
          }}
        />
      </Card>
    </div>
  );
}
