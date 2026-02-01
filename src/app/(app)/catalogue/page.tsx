'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Plus, Filter, Menu, Bell, Clock, ChevronRight } from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';
import { cn } from '@/lib/utils';

const mockServices = [
  { id: 1, name: 'Стрижка', duration: '45 хв', price: 40, category: 'Волосся' },
  { id: 2, name: 'Колір волосся', duration: '1г 15хв', price: 57, category: 'Волосся' },
  { id: 3, name: 'Укладка феном', duration: '35 хв', price: 35, category: 'Волосся' },
  { id: 4, name: 'Балаяж', duration: '2г 30хв', price: 150, category: 'Волосся' },
  { id: 5, name: 'Манікюр', duration: '1г', price: 25, category: 'Нігті' },
  { id: 6, name: 'Педікюр', duration: '1г 30хв', price: 35, category: 'Нігті' },
];

const categories = ['Всі', 'Волосся', 'Нігті'];

export default function CataloguePage() {
  const { open: openSidebar } = useSidebar();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Всі');

  const filteredServices = mockServices.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'Всі' || service.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedServices = filteredServices.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = [];
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, typeof mockServices>);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-20">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 transition-transform active:scale-95" 
          onClick={openSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <h1 className="text-base font-semibold">Каталог</h1>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 relative transition-transform active:scale-95">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>
          <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-medium">
            D
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {/* Desktop title */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Меню послуг</h1>
            <p className="text-muted-foreground">
              Переглядайте та керуйте послугами вашого закладу
            </p>
          </div>
          <Button className="transition-transform active:scale-95">
            <Plus className="h-4 w-4 mr-2" />
            Додати
          </Button>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Пошук послуги" 
              className="pl-10" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0 transition-transform active:scale-95">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "secondary" : "outline"}
              size="sm"
              className="shrink-0 transition-transform active:scale-95"
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
              {cat === 'Всі' && ` (${mockServices.length})`}
            </Button>
          ))}
        </div>

        {/* Services by category */}
        <div className="space-y-4">
          {Object.entries(groupedServices).map(([category, services]) => (
            <Card key={category} className="overflow-hidden">
              <div className="p-4 border-b bg-muted/30">
                <h3 className="font-medium">{category}</h3>
              </div>
              <div className="divide-y">
                {services.map((service) => (
                  <div 
                    key={service.id} 
                    className="p-4 transition-all hover:bg-muted/50 active:bg-muted cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{service.name}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {service.duration}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{service.price} €</p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        {filteredServices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Послуг не знайдено</p>
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <Button 
        className="lg:hidden fixed right-4 bottom-24 w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
