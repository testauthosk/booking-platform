'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Plus, Filter } from 'lucide-react';

const mockServices = [
  { id: 1, name: 'Стрижка', duration: '45 хв', price: '40 €', category: 'Волосся та укладка' },
  { id: 2, name: 'Колір волосся', duration: '1г 15хв', price: '57 €', category: 'Волосся та укладка' },
  { id: 3, name: 'Укладка феном', duration: '35 хв', price: '35 €', category: 'Волосся та укладка' },
  { id: 4, name: 'Балаяж', duration: '2г 30хв', price: '150 €', category: 'Волосся та укладка' },
];

export default function CataloguePage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Меню послуг</h1>
          <p className="text-muted-foreground">
            Переглядайте та керуйте послугами вашого закладу
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Додати
        </Button>
      </div>

      {/* Пошук */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Пошук за назвою послуги" className="pl-10" />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Категорії */}
      <div className="flex gap-2 mb-6">
        <Button variant="secondary" size="sm">Всі категорії (4)</Button>
        <Button variant="outline" size="sm">Волосся та укладка (4)</Button>
      </div>

      {/* Список послуг */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-medium">Волосся та укладка</h3>
        </div>
        <div className="divide-y">
          {mockServices.map((service) => (
            <div key={service.id} className="p-4 hover:bg-muted/50 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-muted-foreground">{service.duration}</p>
                </div>
                <p className="font-medium">{service.price}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
