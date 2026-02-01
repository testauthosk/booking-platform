'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, Plus, Filter, Menu, Bell, ChevronRight, Phone, Mail } from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';

const mockClients = [
  { id: 1, name: 'Jack Doe', email: 'jack@example.com', phone: '+380 99 123 4567', avatar: 'J', visits: 5 },
  { id: 2, name: 'Jane Doe', email: 'jane@example.com', phone: '+380 67 234 5678', avatar: 'J', visits: 3 },
  { id: 3, name: 'John Doe', email: 'john@example.com', phone: '+380 50 345 6789', avatar: 'J', visits: 12 },
];

export default function ClientsPage() {
  const { open: openSidebar } = useSidebar();
  const [search, setSearch] = useState('');

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.email.toLowerCase().includes(search.toLowerCase()) ||
    client.phone.includes(search)
  );

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
        
        <h1 className="text-base font-semibold">Клієнти</h1>

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
            <h1 className="text-2xl font-bold">Клієнти</h1>
            <p className="text-muted-foreground">
              Переглядайте, додавайте та керуйте клієнтами
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
              placeholder="Ім'я, email або телефон"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0 transition-transform active:scale-95">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Clients count */}
        <p className="text-sm text-muted-foreground mb-3">
          {filteredClients.length} клієнтів
        </p>

        {/* Clients list */}
        <div className="space-y-2">
          {filteredClients.map((client) => (
            <Card 
              key={client.id} 
              className="p-4 transition-all hover:shadow-md active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-lg">
                    {client.avatar}
                  </div>
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">{client.visits} візитів</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        {filteredClients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Клієнтів не знайдено</p>
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
