'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  Filter,
  RefreshCw,
  User,
  Calendar,
  Package,
  Settings,
  Trash2,
  Edit,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AuditLog {
  id: string;
  salonId: string;
  actorType: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  changes: any;
  createdAt: string;
  salon?: { name: string };
}

const actionIcons: Record<string, any> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
};

const entityIcons: Record<string, any> = {
  booking: Calendar,
  client: User,
  service: Settings,
  product: Package,
  master: User,
};

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ entityType: '', action: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 50;

  useEffect(() => {
    fetchLogs();
  }, [page, filter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
        ...(filter.entityType && { entityType: filter.entityType }),
        ...(filter.action && { action: filter.action }),
        ...(search && { search }),
      });

      const res = await fetch(`/api/admin/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatChanges = (changes: any) => {
    if (!changes) return null;
    return Object.entries(changes).map(([key, value]: [string, any]) => (
      <div key={key} className="text-xs">
        <span className="text-gray-500">{key}:</span>{' '}
        <span className="text-red-400 line-through">{JSON.stringify(value.old)}</span>{' '}
        <span className="text-green-400">→ {JSON.stringify(value.new)}</span>
      </div>
    ));
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-green-400 bg-green-500/10';
      case 'UPDATE': return 'text-blue-400 bg-blue-500/10';
      case 'DELETE': return 'text-red-400 bg-red-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Логи</h1>
          <p className="text-gray-400 text-sm">Історія всіх дій на платформі</p>
        </div>
        <Button 
          onClick={fetchLogs} 
          variant="outline" 
          className="bg-transparent border-white/10 text-white hover:bg-white/5"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Оновити
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-[#12121a] border-white/5 p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Пошук по імені, салону..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
          
          <select
            value={filter.entityType}
            onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
          >
            <option value="">Всі типи</option>
            <option value="booking">Бронювання</option>
            <option value="client">Клієнти</option>
            <option value="service">Послуги</option>
            <option value="master">Майстри</option>
            <option value="product">Товари</option>
          </select>

          <select
            value={filter.action}
            onChange={(e) => setFilter({ ...filter, action: e.target.value })}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
          >
            <option value="">Всі дії</option>
            <option value="CREATE">Створення</option>
            <option value="UPDATE">Зміна</option>
            <option value="DELETE">Видалення</option>
          </select>
        </div>
      </Card>

      {/* Logs list */}
      <Card className="bg-[#12121a] border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Завантаження...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Логів не знайдено</div>
        ) : (
          <div className="divide-y divide-white/5">
            {logs.map((log) => {
              const ActionIcon = actionIcons[log.action] || Edit;
              const EntityIcon = entityIcons[log.entityType] || Settings;
              
              return (
                <div key={log.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getActionColor(log.action)}`}>
                      <ActionIcon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">
                          {log.actorName || log.actorType}
                        </span>
                        <span className="text-gray-500">
                          {log.action === 'CREATE' && 'створив'}
                          {log.action === 'UPDATE' && 'змінив'}
                          {log.action === 'DELETE' && 'видалив'}
                        </span>
                        <span className="text-gray-400 flex items-center gap-1">
                          <EntityIcon className="w-3 h-3" />
                          {log.entityType}
                        </span>
                        {log.entityName && (
                          <span className="text-white font-medium">"{log.entityName}"</span>
                        )}
                      </div>

                      {/* Salon */}
                      {log.salon && (
                        <p className="text-xs text-gray-500 mb-1">
                          Салон: {log.salon.name}
                        </p>
                      )}

                      {/* Changes */}
                      {log.changes && (
                        <div className="mt-2 p-2 bg-white/5 rounded text-xs font-mono">
                          {formatChanges(log.changes)}
                        </div>
                      )}
                    </div>

                    {/* Time */}
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('uk-UA')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > perPage && (
          <div className="flex items-center justify-between p-4 border-t border-white/5">
            <p className="text-sm text-gray-500">
              Показано {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} з {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="bg-transparent border-white/10 text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-400">
                {page} / {Math.ceil(total / perPage)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page * perPage >= total}
                className="bg-transparent border-white/10 text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
