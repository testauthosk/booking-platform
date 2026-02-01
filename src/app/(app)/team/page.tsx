'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Plus, Filter, MoreVertical } from 'lucide-react';

const mockTeam = [
  { id: 1, name: "Don't Pursue", avatar: 'D', hours: '52г', color: 'bg-orange-500' },
  { id: 2, name: 'Wendy Smith (Demo)', avatar: null, hours: '52г', color: 'bg-pink-500', image: '/avatar.jpg' },
];

export default function TeamPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Команда</h1>
          <p className="text-muted-foreground">Учасники команди</p>
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
          <Input placeholder="Пошук учасників команди" className="pl-10" />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Список команди */}
      <div className="space-y-2">
        {mockTeam.map((member) => (
          <Card key={member.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full ${member.color} flex items-center justify-center text-white font-medium`}>
                  {member.avatar || member.name[0]}
                </div>
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.hours}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
