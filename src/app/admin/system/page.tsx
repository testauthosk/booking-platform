'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Database,
  MessageCircle,
  Globe,
  Server,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  HardDrive,
  Cpu,
  Wifi,
} from 'lucide-react';

interface SystemStatus {
  database: {
    status: 'ok' | 'error';
    latency: number;
    version: string;
  };
  telegram: {
    status: 'ok' | 'error' | 'not_configured';
    webhookUrl: string | null;
  };
  vercel: {
    region: string;
    runtime: string;
  };
  env: {
    name: string;
    set: boolean;
  }[];
  memory: {
    used: number;
    total: number;
  };
  uptime: number;
}

export default function SystemPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/system');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (service: string) => {
    setTesting(service);
    try {
      await fetch(`/api/admin/system/test?service=${service}`);
      await fetchStatus();
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setTesting(null);
    }
  };

  const StatusBadge = ({ status }: { status: 'ok' | 'error' | 'not_configured' | string }) => {
    if (status === 'ok') {
      return (
        <span className="flex items-center gap-1.5 text-green-400 text-sm">
          <CheckCircle className="w-4 h-4" />
          Працює
        </span>
      );
    }
    if (status === 'not_configured') {
      return (
        <span className="flex items-center gap-1.5 text-yellow-400 text-sm">
          <AlertTriangle className="w-4 h-4" />
          Не налаштовано
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-red-400 text-sm">
        <XCircle className="w-4 h-4" />
        Помилка
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded w-48" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const s = status || {
    database: { status: 'error', latency: 0, version: '-' },
    telegram: { status: 'not_configured', webhookUrl: null },
    vercel: { region: '-', runtime: '-' },
    env: [],
    memory: { used: 0, total: 0 },
    uptime: 0,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Система</h1>
          <p className="text-gray-400 text-sm">Моніторинг та діагностика</p>
        </div>
        <Button 
          onClick={fetchStatus} 
          variant="outline" 
          className="bg-transparent border-white/10 text-white hover:bg-white/5"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Оновити
        </Button>
      </div>

      {/* Services */}
      <div className="grid grid-cols-2 gap-4">
        {/* Database */}
        <Card className="bg-[#12121a] border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">PostgreSQL</h3>
                <p className="text-xs text-gray-500">База даних</p>
              </div>
            </div>
            <StatusBadge status={s.database.status} />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Версія</span>
              <span className="text-white">{s.database.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Затримка</span>
              <span className="text-white">{s.database.latency}ms</span>
            </div>
          </div>
          <Button
            onClick={() => testConnection('database')}
            disabled={testing === 'database'}
            size="sm"
            variant="outline"
            className="w-full mt-4 bg-transparent border-white/10 text-white"
          >
            {testing === 'database' ? 'Тестування...' : 'Перевірити зʼєднання'}
          </Button>
        </Card>

        {/* Telegram */}
        <Card className="bg-[#12121a] border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Telegram Bot</h3>
                <p className="text-xs text-gray-500">Сповіщення</p>
              </div>
            </div>
            <StatusBadge status={s.telegram.status} />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Webhook</span>
              <span className="text-white truncate max-w-[200px]">
                {s.telegram.webhookUrl || 'Не встановлено'}
              </span>
            </div>
          </div>
          <Button
            onClick={() => testConnection('telegram')}
            disabled={testing === 'telegram'}
            size="sm"
            variant="outline"
            className="w-full mt-4 bg-transparent border-white/10 text-white"
          >
            {testing === 'telegram' ? 'Тестування...' : 'Перевірити бота'}
          </Button>
        </Card>

        {/* Vercel */}
        <Card className="bg-[#12121a] border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Vercel</h3>
                <p className="text-xs text-gray-500">Хостинг</p>
              </div>
            </div>
            <StatusBadge status="ok" />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Регіон</span>
              <span className="text-white">{s.vercel.region}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Runtime</span>
              <span className="text-white">{s.vercel.runtime}</span>
            </div>
          </div>
        </Card>

        {/* Runtime */}
        <Card className="bg-[#12121a] border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Server className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Runtime</h3>
                <p className="text-xs text-gray-500">Node.js</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Uptime</span>
              <span className="text-white">{Math.floor(s.uptime / 3600)}h {Math.floor((s.uptime % 3600) / 60)}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Памʼять</span>
              <span className="text-white">
                {Math.round(s.memory.used / 1024 / 1024)}MB / {Math.round(s.memory.total / 1024 / 1024)}MB
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Environment Variables */}
      <Card className="bg-[#12121a] border-white/5 p-5">
        <h3 className="font-semibold text-white mb-4">Змінні оточення</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {s.env.map((env) => (
            <div 
              key={env.name}
              className={`flex items-center justify-between p-3 rounded-lg ${
                env.set ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}
            >
              <span className="text-sm text-gray-300 font-mono">{env.name}</span>
              {env.set ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
