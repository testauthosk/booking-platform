'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Download, ChevronLeft, ChevronRight } from 'lucide-react';

export default function SalesPage() {
  const today = new Date().toLocaleDateString('uk-UA', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Щоденні продажі</h1>
          <p className="text-muted-foreground">
            Перегляд, фільтрація та експорт транзакцій
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Експорт
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Додати
          </Button>
        </div>
      </div>

      {/* Дата */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline">Сьогодні</Button>
        <span className="font-medium">{today}</span>
      </div>

      {/* Таблиця продажів */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-medium mb-4">Зведення транзакцій</h3>
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-muted-foreground">
                <th className="pb-2">Тип позиції</th>
                <th className="pb-2 text-right">К-сть</th>
                <th className="pb-2 text-right">Сума</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {['Послуги', 'Товари', 'Подарункові карти', 'Членство'].map((item) => (
                <tr key={item} className="border-t">
                  <td className="py-2">{item}</td>
                  <td className="py-2 text-right">0</td>
                  <td className="py-2 text-right">0,00 €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-6">
          <h3 className="font-medium mb-4">Зведення готівки</h3>
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-muted-foreground">
                <th className="pb-2">Тип платежу</th>
                <th className="pb-2 text-right">Зібрано</th>
                <th className="pb-2 text-right">Повернено</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {['Готівка', 'Картка', 'Інше'].map((item) => (
                <tr key={item} className="border-t">
                  <td className="py-2">{item}</td>
                  <td className="py-2 text-right">0,00 €</td>
                  <td className="py-2 text-right">0,00 €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
