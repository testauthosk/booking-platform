'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, User, Calendar, FileText, Users, Clock } from 'lucide-react';
import Link from 'next/link';

const DEFAULT_SALON_ID = '93b6801f-0193-4706-896b-3de71f3799e1';

interface AuditLogEntry {
  id: string;
  actorType: string;
  actorName?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityName?: string;
  changes?: Record<string, unknown>;
  createdAt: string;
}

const actionLabels: Record<string, string> = {
  CREATE: 'Створено',
  UPDATE: 'Змінено',
  DELETE: 'Видалено',
};

const actionColors: Record<string, string> = {
  CREATE: 'text-green-600 bg-green-50',
  UPDATE: 'text-blue-600 bg-blue-50',
  DELETE: 'text-red-600 bg-red-50',
};

const entityIcons: Record<string, typeof User> = {
  master: User,
  booking: Calendar,
  service: FileText,
  client: Users,
};

const entityLabels: Record<string, string> = {
  master: 'Майстер',
  booking: 'Запис',
  service: 'Послуга',
  client: 'Клієнт',
  category: 'Категорія',
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Меньше часа
  if (diff < 60 * 60 * 1000) {
    const mins = Math.floor(diff / (60 * 1000));
    return `${mins} хв тому`;
  }
  
  // Меньше дня
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours} год тому`;
  }
  
  // Полная дата
  return date.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 30;

  useEffect(() => {
    loadLogs();
  }, [offset]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit-log?salonId=${salonId}&limit=${limit}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/setup">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Історія змін</h1>
          <p className="text-muted-foreground">Журнал всіх дій в системі</p>
        </div>
      </div>

      {/* Loading */}
      {loading && logs.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && logs.length === 0 && (
        <Card className="p-8 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Історія змін порожня</p>
        </Card>
      )}

      {/* Logs list */}
      {logs.length > 0 && (
        <div className="space-y-3">
          {logs.map((log) => {
            const Icon = entityIcons[log.entityType] || FileText;
            
            return (
              <Card key={log.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColors[log.action]}`}>
                        {actionLabels[log.action]}
                      </span>
                      <span className="text-sm font-medium">
                        {entityLabels[log.entityType] || log.entityType}
                      </span>
                      {log.entityName && (
                        <span className="text-sm text-muted-foreground truncate">
                          "{log.entityName}"
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{log.actorName || log.actorType}</span>
                      <span>•</span>
                      <span>{formatDate(log.createdAt)}</span>
                    </div>

                    {/* Changes details */}
                    {log.changes && Object.keys(log.changes).length > 0 && log.action === 'UPDATE' && (
                      <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                        {Object.entries(log.changes).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span>{' '}
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Показано {offset + 1}-{Math.min(offset + limit, total)} з {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + limit >= total}
                  onClick={() => setOffset(offset + limit)}
                >
                  Далі
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
