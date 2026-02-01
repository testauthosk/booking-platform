'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, Plus, Filter } from 'lucide-react';

const mockClients = [
  { id: 1, name: 'Jack Doe', email: 'jack@example.com', avatar: 'J' },
  { id: 2, name: 'Jane Doe', email: 'jane@example.com', avatar: 'J' },
  { id: 3, name: 'John Doe', email: 'john@example.com', avatar: 'J' },
];

export default function ClientsPage() {
  const [search, setSearch] = useState('');

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Клієнти</h1>
          <p className="text-muted-foreground">
            Переглядайте, додавайте та керуйте клієнтами
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
          <Input
            placeholder="Ім'я, email або телефон"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Список клієнтів */}
      <div className="space-y-2">
        {filteredClients.map((client) => (
          <Card key={client.id} className="p-4 hover:bg-muted/50 cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                {client.avatar}
              </div>
              <div>
                <p className="font-medium">{client.name}</p>
                <p className="text-sm text-muted-foreground">{client.email}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
