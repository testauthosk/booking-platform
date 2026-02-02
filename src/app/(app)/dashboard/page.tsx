'use client';
import { NotificationBell } from '@/components/notifications/notification-bell';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Menu, Bell, TrendingUp, Calendar, Users, DollarSign } from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';
import Link from 'next/link';

export default function DashboardPage() {
  const { open: openSidebar } = useSidebar();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-20">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 rounded-xl transition-transform active:scale-95" 
          onClick={openSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <h1 className="text-base font-semibold">Головна</h1>

        <div className="flex items-center gap-1">
          <NotificationBell />
          <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center text-white text-sm font-medium">
            D
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Desktop title */}
        <h1 className="hidden lg:block text-2xl font-bold">Головна панель</h1>
        
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0 €</p>
                  <p className="text-xs text-muted-foreground">Продажі</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-xs text-muted-foreground">Записи</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">2</p>
                  <p className="text-xs text-muted-foreground">Клієнти</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">+12%</p>
                  <p className="text-xs text-muted-foreground">Зростання</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent bookings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Найближчі записи</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/calendar">Усі</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg transition-all hover:bg-muted/50">
              <div>
                <p className="font-medium">Стрижка</p>
                <p className="text-sm text-muted-foreground">John Doe · 1г 45хв</p>
              </div>
              <div className="text-sm text-muted-foreground text-right">
                <p>31 січ.</p>
                <p>11:00</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg transition-all hover:bg-muted/50">
              <div>
                <p className="font-medium">Фарбування</p>
                <p className="text-sm text-muted-foreground">Jane Smith · 2г 30хв</p>
              </div>
              <div className="text-sm text-muted-foreground text-right">
                <p>1 лют.</p>
                <p>14:00</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg transition-all hover:bg-muted/50">
              <div>
                <p className="font-medium">Манікюр</p>
                <p className="text-sm text-muted-foreground">Alex Brown · 1г</p>
              </div>
              <div className="text-sm text-muted-foreground text-right">
                <p>2 лют.</p>
                <p>10:30</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
            <Link href="/calendar">
              <Calendar className="h-5 w-5" />
              <span>Календар</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
            <Link href="/clients">
              <Users className="h-5 w-5" />
              <span>Клієнти</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
