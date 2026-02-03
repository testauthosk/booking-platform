'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Settings,
  Globe,
  MessageCircle,
  Database,
  Shield,
  Key,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface SystemSettings {
  telegramBotToken: boolean;
  telegramWebhook: string | null;
  cronSecret: boolean;
  databaseUrl: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/system');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          telegramBotToken: data.telegram.status !== 'not_configured',
          telegramWebhook: data.telegram.webhookUrl,
          cronSecret: data.env.find((e: any) => e.name === 'CRON_SECRET')?.set || false,
          databaseUrl: data.env.find((e: any) => e.name === 'DATABASE_URL')?.set || false,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const ConfigItem = ({ 
    icon: Icon, 
    title, 
    description, 
    configured, 
    action 
  }: {
    icon: any;
    title: string;
    description: string;
    configured: boolean;
    action?: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          configured ? 'bg-green-500/20' : 'bg-orange-500/20'
        }`}>
          <Icon className={`w-5 h-5 ${configured ? 'text-green-400' : 'text-orange-400'}`} />
        </div>
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {configured ? (
          <span className="flex items-center gap-1.5 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            Налаштовано
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-orange-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            Не налаштовано
          </span>
        )}
        {action}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Налаштування</h1>
        <p className="text-gray-400 text-sm">Глобальні налаштування платформи</p>
      </div>

      {/* System Configuration */}
      <Card className="bg-[#12121a] border-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          Конфігурація системи
        </h2>
        
        <div className="space-y-3">
          <ConfigItem
            icon={Database}
            title="База даних"
            description="PostgreSQL підключення"
            configured={settings?.databaseUrl || false}
          />

          <ConfigItem
            icon={MessageCircle}
            title="Telegram Bot"
            description={settings?.telegramWebhook || 'Webhook не встановлено'}
            configured={settings?.telegramBotToken || false}
            action={
              <a 
                href="https://core.telegram.org/bots/tutorial" 
                target="_blank"
                className="text-violet-400 hover:text-violet-300 text-sm flex items-center gap-1"
              >
                Документація <ExternalLink className="w-3 h-3" />
              </a>
            }
          />

          <ConfigItem
            icon={Shield}
            title="Cron Secret"
            description="Захист ендпоінтів cron-задач"
            configured={settings?.cronSecret || false}
          />
        </div>
      </Card>

      {/* Environment Variables Info */}
      <Card className="bg-[#12121a] border-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-gray-400" />
          Змінні оточення
        </h2>
        
        <div className="bg-white/5 rounded-lg p-4 text-sm text-gray-400">
          <p className="mb-3">Для налаштування додайте ці змінні в Vercel/Railway:</p>
          <div className="font-mono text-xs space-y-1">
            <p><span className="text-violet-400">DATABASE_URL</span>=postgresql://...</p>
            <p><span className="text-violet-400">NEXTAUTH_SECRET</span>=your-secret-key</p>
            <p><span className="text-violet-400">NEXTAUTH_URL</span>=https://your-domain.com</p>
            <p><span className="text-violet-400">TELEGRAM_BOT_TOKEN</span>=123456:ABC...</p>
            <p><span className="text-violet-400">CRON_SECRET</span>=your-cron-secret</p>
            <p><span className="text-violet-400">CLOUDINARY_CLOUD_NAME</span>=your-cloud</p>
            <p><span className="text-violet-400">CLOUDINARY_API_KEY</span>=...</p>
            <p><span className="text-violet-400">CLOUDINARY_API_SECRET</span>=...</p>
          </div>
        </div>
      </Card>

      {/* Quick Links */}
      <Card className="bg-[#12121a] border-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-gray-400" />
          Швидкі посилання
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          <a 
            href="https://vercel.com" 
            target="_blank"
            className="flex items-center gap-3 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="text-xl">▲</span>
            </div>
            <div>
              <p className="font-medium text-white">Vercel Dashboard</p>
              <p className="text-sm text-gray-500">Деплой та логи</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-500 ml-auto" />
          </a>

          <a 
            href="https://railway.app" 
            target="_blank"
            className="flex items-center gap-3 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <span className="text-xl">🚂</span>
            </div>
            <div>
              <p className="font-medium text-white">Railway Dashboard</p>
              <p className="text-sm text-gray-500">База даних</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-500 ml-auto" />
          </a>

          <a 
            href="https://cloudinary.com/console" 
            target="_blank"
            className="flex items-center gap-3 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="text-xl">☁️</span>
            </div>
            <div>
              <p className="font-medium text-white">Cloudinary</p>
              <p className="text-sm text-gray-500">Зображення</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-500 ml-auto" />
          </a>

          <a 
            href="https://t.me/BotFather" 
            target="_blank"
            className="flex items-center gap-3 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="font-medium text-white">Telegram BotFather</p>
              <p className="text-sm text-gray-500">Керування ботом</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-500 ml-auto" />
          </a>
        </div>
      </Card>

      {/* Platform Info */}
      <Card className="bg-[#12121a] border-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Про платформу</h2>
        <div className="space-y-2 text-sm text-gray-400">
          <p><strong className="text-white">Версія:</strong> 1.0.0</p>
          <p><strong className="text-white">Next.js:</strong> 15.x</p>
          <p><strong className="text-white">Prisma:</strong> 5.x</p>
          <p><strong className="text-white">База:</strong> PostgreSQL</p>
        </div>
      </Card>
    </div>
  );
}
