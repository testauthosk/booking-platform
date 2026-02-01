'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Plus, Filter, MoreVertical, Menu, Bell, ChevronRight, Clock, Calendar } from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';

const mockTeam = [
  { id: 1, name: "Don't Pursue", avatar: 'D', hours: '52г', color: 'bg-orange-500', position: 'Власник' },
  { id: 2, name: 'Wendy Smith (Demo)', avatar: 'W', hours: '52г', color: 'bg-pink-500', position: 'Майстер' },
];

export default function TeamPage() {
  const { open: openSidebar } = useSidebar();
  const [search, setSearch] = useState('');

  const filteredTeam = mockTeam.filter(member => 
    member.name.toLowerCase().includes(search.toLowerCase())
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
        
        <h1 className="text-base font-semibold">Команда</h1>

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
            <h1 className="text-2xl font-bold">Команда</h1>
            <p className="text-muted-foreground">Учасники команди</p>
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
              placeholder="Пошук учасників команди" 
              className="pl-10" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0 transition-transform active:scale-95">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Team list */}
        <div className="space-y-2">
          {filteredTeam.map((member) => (
            <Card 
              key={member.id} 
              className="p-4 transition-all hover:shadow-md active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full ${member.color} flex items-center justify-center text-white font-medium text-lg`}>
                    {member.avatar}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.position}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {member.hours}
                  </div>
                  <Button variant="ghost" size="icon" className="transition-transform active:scale-95">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        {filteredTeam.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Нічого не знайдено</p>
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
