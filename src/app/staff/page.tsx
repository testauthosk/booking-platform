'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, Settings, Clock, LogOut, User, Loader2 } from 'lucide-react';

export default function StaffDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const name = localStorage.getItem('staffName');
    
    if (!token) {
      router.push('/staff/login');
      return;
    }
    
    setStaffName(name || 'Майстер');
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffId');
    localStorage.removeItem('staffName');
    router.push('/staff/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
            {staffName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{staffName}</p>
            <p className="text-xs text-muted-foreground">Особистий кабінет</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      {/* Content */}
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">Вітаємо, {staffName}!</h1>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/staff/calendar')}
          >
            <Calendar className="h-8 w-8 text-primary mb-2" />
            <p className="font-medium">Мій календар</p>
            <p className="text-sm text-muted-foreground">Розклад записів</p>
          </Card>

          <Card 
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/staff/schedule')}
          >
            <Clock className="h-8 w-8 text-primary mb-2" />
            <p className="font-medium">Графік роботи</p>
            <p className="text-sm text-muted-foreground">Робочі години</p>
          </Card>

          <Card 
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/staff/profile')}
          >
            <User className="h-8 w-8 text-primary mb-2" />
            <p className="font-medium">Мій профіль</p>
            <p className="text-sm text-muted-foreground">Дані та фото</p>
          </Card>

          <Card 
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/staff/settings')}
          >
            <Settings className="h-8 w-8 text-primary mb-2" />
            <p className="font-medium">Налаштування</p>
            <p className="text-sm text-muted-foreground">Сповіщення</p>
          </Card>
        </div>

        {/* Today's appointments placeholder */}
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Записи на сьогодні</h2>
          <p className="text-muted-foreground text-sm">
            Тут буде відображатися ваш розклад на сьогодні
          </p>
        </Card>
      </div>
    </div>
  );
}
