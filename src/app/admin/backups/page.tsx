'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Download,
  Database,
  Calendar,
  Users,
  Store,
  Package,
  Loader2,
  CheckCircle,
  FileJson,
  Clock,
} from 'lucide-react';

interface ExportOption {
  id: string;
  name: string;
  description: string;
  icon: any;
  tables: string[];
}

const exportOptions: ExportOption[] = [
  {
    id: 'full',
    name: 'Повний бекап',
    description: 'Всі дані платформи',
    icon: Database,
    tables: ['salons', 'users', 'masters', 'clients', 'bookings', 'services', 'products', 'reviews'],
  },
  {
    id: 'salons',
    name: 'Салони',
    description: 'Інформація про салони та налаштування',
    icon: Store,
    tables: ['salons'],
  },
  {
    id: 'users',
    name: 'Користувачі',
    description: 'Адміни, майстри та їх дані',
    icon: Users,
    tables: ['users', 'masters'],
  },
  {
    id: 'clients',
    name: 'Клієнти',
    description: 'База клієнтів всіх салонів',
    icon: Users,
    tables: ['clients'],
  },
  {
    id: 'bookings',
    name: 'Бронювання',
    description: 'Історія всіх записів',
    icon: Calendar,
    tables: ['bookings'],
  },
  {
    id: 'inventory',
    name: 'Склад',
    description: 'Товари та рухи',
    icon: Package,
    tables: ['products', 'stockMovements', 'productCategories'],
  },
];

interface BackupHistory {
  id: string;
  type: string;
  createdAt: string;
  size: string;
  tables: string[];
}

export default function BackupsPage() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [history, setHistory] = useState<BackupHistory[]>([]);
  const [lastExport, setLastExport] = useState<{ type: string; time: string } | null>(null);

  const handleExport = async (option: ExportOption) => {
    setExporting(option.id);
    
    try {
      const res = await fetch(`/api/admin/backup?type=${option.id}`);
      if (!res.ok) throw new Error('Export failed');

      const data = await res.json();
      
      // Download as JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${option.id}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastExport({ type: option.name, time: new Date().toLocaleTimeString('uk-UA') });
    } catch (error) {
      console.error('Export error:', error);
      alert('Помилка експорту');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Бекапи</h1>
        <p className="text-gray-400 text-sm">Експорт та резервне копіювання даних</p>
      </div>

      {/* Last export notification */}
      {lastExport && (
        <Card className="bg-green-500/10 border-green-500/20 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-green-400 font-medium">Експорт завершено</p>
              <p className="text-sm text-green-400/70">{lastExport.type} — {lastExport.time}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Export options */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {exportOptions.map((option) => (
          <Card 
            key={option.id}
            className="bg-[#12121a] border-white/5 p-5 hover:border-violet-500/50 transition-colors cursor-pointer"
            onClick={() => !exporting && handleExport(option)}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <option.icon className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{option.name}</h3>
                <p className="text-xs text-gray-500">{option.description}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1 mb-4">
              {option.tables.map((table) => (
                <span 
                  key={table}
                  className="text-xs px-2 py-0.5 bg-white/5 rounded text-gray-400"
                >
                  {table}
                </span>
              ))}
            </div>

            <Button
              disabled={!!exporting}
              className="w-full bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border-0"
            >
              {exporting === option.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Експорт...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Експортувати
                </>
              )}
            </Button>
          </Card>
        ))}
      </div>

      {/* Info */}
      <Card className="bg-[#12121a] border-white/5 p-5">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <FileJson className="w-4 h-4 text-gray-400" />
          Про експорт
        </h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>• Дані експортуються в форматі JSON</li>
          <li>• Паролі та токени НЕ включаються в експорт</li>
          <li>• Для великих баз рекомендується експорт по частинах</li>
          <li>• Зберігайте бекапи в безпечному місці</li>
        </ul>
      </Card>

      {/* Scheduled backups - future feature */}
      <Card className="bg-[#12121a] border-white/5 p-5 opacity-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Автоматичні бекапи</h3>
              <p className="text-xs text-gray-500">Скоро</p>
            </div>
          </div>
          <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">Coming soon</span>
        </div>
      </Card>
    </div>
  );
}
