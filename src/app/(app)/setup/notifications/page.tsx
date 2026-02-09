// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, Bell, MessageCircle, Mail, Smartphone, Clock, Gift, UserCheck } from 'lucide-react';
import Link from 'next/link';

interface NotifySettings {
  notifyChannels: string[];
  notifyReminder24h: boolean;
  notifyReminder2h: boolean;
  notifyReminder1h: boolean;
  notifyAfterVisit: boolean;
  notifyBirthday: boolean;
  notifyReturnDays: number;
}

const RETURN_OPTIONS = [
  { value: 0, label: 'Вимкнено' },
  { value: 14, label: 'Через 14 днів' },
  { value: 30, label: 'Через 30 днів' },
  { value: 60, label: 'Через 60 днів' },
  { value: 90, label: 'Через 90 днів' },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-gray-300'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
        checked ? 'translate-x-5' : ''
      }`} />
    </button>
  );
}

export default function NotificationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<NotifySettings | null>(null);

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSettings(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (channel: string) => {
    if (!settings) return;
    const channels = settings.notifyChannels.includes(channel)
      ? settings.notifyChannels.filter(c => c !== channel)
      : [...settings.notifyChannels, channel];
    setSettings({ ...settings, notifyChannels: channels });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!settings) {
    return <div className="p-6 text-center text-gray-400">Помилка завантаження</div>;
  }

  const channelOptions = [
    { id: 'telegram', icon: MessageCircle, label: 'Telegram', color: 'text-blue-500' },
    { id: 'email', icon: Mail, label: 'Email', color: 'text-orange-500' },
    { id: 'sms', icon: Smartphone, label: 'SMS', color: 'text-green-500', badge: 'Pro' },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/setup">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Сповіщення</h1>
          <p className="text-sm text-gray-500">Налаштуйте автоматичні повідомлення клієнтам</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Channels ── */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-600" />
            <h2 className="font-medium">Канали доставки</h2>
          </div>
          <p className="text-xs text-gray-500">Оберіть через які канали надсилати сповіщення</p>

          <div className="space-y-3">
            {channelOptions.map(ch => (
              <div key={ch.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ch.icon className={`w-5 h-5 ${ch.color}`} />
                  <span className="text-sm font-medium">{ch.label}</span>
                  {ch.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded font-medium">
                      {ch.badge}
                    </span>
                  )}
                </div>
                <Toggle
                  checked={settings.notifyChannels.includes(ch.id)}
                  onChange={() => toggleChannel(ch.id)}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* ── Reminders ── */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="font-medium">Нагадування перед візитом</h2>
          </div>

          {[
            { key: 'notifyReminder24h' as const, label: 'За 24 години', desc: 'Нагадування за день до візиту' },
            { key: 'notifyReminder2h' as const, label: 'За 2 години', desc: 'Коротке нагадування перед візитом' },
            { key: 'notifyReminder1h' as const, label: 'За 1 годину', desc: 'Фінальне нагадування' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <Toggle
                checked={settings[item.key]}
                onChange={v => setSettings({ ...settings, [item.key]: v })}
              />
            </div>
          ))}
        </Card>

        {/* ── After visit ── */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-600" />
            <h2 className="font-medium">Після візиту</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Подяка + запит відгуку</p>
              <p className="text-xs text-gray-500">Автоматичне повідомлення після завершення візиту</p>
            </div>
            <Toggle
              checked={settings.notifyAfterVisit}
              onChange={v => setSettings({ ...settings, notifyAfterVisit: v })}
            />
          </div>
        </Card>

        {/* ── Birthday ── */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-500" />
            <h2 className="font-medium">Привітання</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">З днем народження</p>
              <p className="text-xs text-gray-500">Автоматичне привітання (потрібна дата народження клієнта)</p>
            </div>
            <Toggle
              checked={settings.notifyBirthday}
              onChange={v => setSettings({ ...settings, notifyBirthday: v })}
            />
          </div>
        </Card>

        {/* ── Return clients ── */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-orange-500" />
            <h2 className="font-medium">Повернення клієнтів</h2>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Нагадати клієнту, якщо давно не був</label>
            <p className="text-xs text-gray-500 mb-2">Автоповідомлення «Ми скучили» через N днів після останнього візиту</p>
            <select
              value={settings.notifyReturnDays}
              onChange={e => setSettings({ ...settings, notifyReturnDays: Number(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {RETURN_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Save */}
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Збереження...</>
          ) : saved ? (
            <>✓ Збережено</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Зберегти зміни</>
          )}
        </Button>
      </div>
    </div>
  );
}
