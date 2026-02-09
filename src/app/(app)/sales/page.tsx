'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Download, ChevronLeft, ChevronRight, Menu, ChevronDown } from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';
import { NotificationBell } from '@/components/notifications/notification-bell';

export default function SalesPage() {
  const { open: openSidebar } = useSidebar();
  const [currentDate, setCurrentDate] = useState(new Date());

  const goToPrevDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const goToNextDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formattedDateShort = currentDate.toLocaleDateString('uk-UA', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  });

  const formattedDateLong = currentDate.toLocaleDateString('uk-UA', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const isToday = currentDate.toDateString() === new Date().toDateString();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile header */}
      <header
        className="lg:hidden bg-white border-b border-gray-200 shrink-0 z-20 sticky top-0"
        style={{ height: 56, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <button
          onClick={openSidebar}
          className="shrink-0 active:scale-95 transition-transform"
          style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Menu className="text-gray-700" style={{ width: 18, height: 18 }} />
        </button>
        
        {/* Date navigation */}
        <div className="flex-1 flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 transition-transform active:scale-95"
            onClick={goToPrevDay}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button className="flex items-center gap-1 hover:bg-muted px-2 py-1 rounded-lg transition-colors">
            <span className="text-sm font-medium">{formattedDateShort}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 transition-transform active:scale-95"
            onClick={goToNextDay}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center shrink-0" style={{ gap: 8 }}>
          <NotificationBell />
          <div
            className="bg-orange-500 text-white text-sm font-medium shrink-0"
            style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            D
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {/* Desktop title */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Щоденні продажі</h1>
            <p className="text-muted-foreground">
              Перегляд, фільтрація та експорт транзакцій
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="transition-transform active:scale-95">
              <Download className="h-4 w-4 mr-2" />
              Експорт
            </Button>
            <Button className="transition-transform active:scale-95">
              <Plus className="h-4 w-4 mr-2" />
              Додати
            </Button>
          </div>
        </div>

        {/* Desktop date navigation */}
        <div className="hidden lg:flex items-center gap-2 mb-6">
          <Button 
            variant="outline" 
            size="icon"
            onClick={goToPrevDay}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant={isToday ? "secondary" : "outline"}
            onClick={goToToday}
          >
            Сьогодні
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={goToNextDay}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="font-medium ml-2">{formattedDateLong}</span>
        </div>

        {/* Total for mobile */}
        <div className="lg:hidden mb-4">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Всього за день</p>
            <p className="text-3xl font-bold">0,00 €</p>
          </Card>
        </div>

        {/* Sales tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <Card className="p-4 lg:p-6">
            <h3 className="font-medium mb-4">Зведення транзакцій</h3>
            <div className="space-y-3">
              {[
                { name: 'Послуги', qty: 0, sum: '0,00 €' },
                { name: 'Товари', qty: 0, sum: '0,00 €' },
                { name: 'Подарункові карти', qty: 0, sum: '0,00 €' },
                { name: 'Членство', qty: 0, sum: '0,00 €' },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{item.name}</span>
                  <div className="flex gap-6 text-sm">
                    <span className="text-muted-foreground w-8 text-right">{item.qty}</span>
                    <span className="font-medium w-16 text-right">{item.sum}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 lg:p-6">
            <h3 className="font-medium mb-4">Зведення готівки</h3>
            <div className="space-y-3">
              {[
                { name: 'Готівка', collected: '0,00 €', refunded: '0,00 €' },
                { name: 'Картка', collected: '0,00 €', refunded: '0,00 €' },
                { name: 'Інше', collected: '0,00 €', refunded: '0,00 €' },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{item.name}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600 w-16 text-right">{item.collected}</span>
                    <span className="text-red-500 w-16 text-right">{item.refunded}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Mobile FAB */}
      <Button 
        className="lg:hidden fixed right-4 bottom-[76px] w-14 h-14 rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
