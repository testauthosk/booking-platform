'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Bell, MessageCircle, Save, Loader2, Check } from 'lucide-react';
import Link from 'next/link';

interface ReminderSettings {
  id: string;
  reminder24h: boolean;
  reminder2h: boolean;
  template24h: string | null;
  template2h: string | null;
  isActive: boolean;
}

const DEFAULT_TEMPLATE_24H = `🔔 Нагадування про візит!

Привіт, {clientName}! 

Завтра о {time} вас чекає {serviceName} у {salonName}.

📍 {address}

Якщо плани змінились — повідомте нас, будь ласка.
До зустрічі! 💈`;

const DEFAULT_TEMPLATE_2H = `⏰ Через 2 години ваш візит!

{clientName}, нагадуємо: о {time} — {serviceName}.

📍 {salonName}
{address}

Чекаємо на вас! ✨`;

export default function RemindersSettingsPage() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/reminders/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);

    try {
      const res = await fetch('/api/reminders/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return <div className="p-4">Помилка завантаження</div>;
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/setup">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Нагадування клієнтам</h1>
          <p className="text-sm text-muted-foreground">Налаштуйте автоматичні нагадування через Telegram</p>
        </div>
      </div>

      {/* Main toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Автоматичні нагадування</p>
                <p className="text-sm text-muted-foreground">Надсилати клієнтам в Telegram</p>
              </div>
            </div>
            <Switch
              checked={settings.isActive}
              onCheckedChange={(checked) => setSettings({ ...settings, isActive: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {settings.isActive && (
        <>
          {/* Timing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Коли надсилати</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="24h">За 24 години до візиту</Label>
                <Switch
                  id="24h"
                  checked={settings.reminder24h}
                  onCheckedChange={(checked) => setSettings({ ...settings, reminder24h: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="2h">За 2 години до візиту</Label>
                <Switch
                  id="2h"
                  checked={settings.reminder2h}
                  onCheckedChange={(checked) => setSettings({ ...settings, reminder2h: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Шаблони повідомлень</CardTitle>
              <CardDescription>
                Доступні змінні: {'{clientName}'}, {'{serviceName}'}, {'{salonName}'}, {'{time}'}, {'{date}'}, {'{address}'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.reminder24h && (
                <div className="space-y-2">
                  <Label>Повідомлення за 24 години</Label>
                  <Textarea
                    value={settings.template24h || DEFAULT_TEMPLATE_24H}
                    onChange={(e) => setSettings({ ...settings, template24h: e.target.value })}
                    rows={6}
                    placeholder={DEFAULT_TEMPLATE_24H}
                  />
                </div>
              )}

              {settings.reminder2h && (
                <div className="space-y-2">
                  <Label>Повідомлення за 2 години</Label>
                  <Textarea
                    value={settings.template2h || DEFAULT_TEMPLATE_2H}
                    onChange={(e) => setSettings({ ...settings, template2h: e.target.value })}
                    rows={5}
                    placeholder={DEFAULT_TEMPLATE_2H}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* How it works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Як клієнт підключає Telegram
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>1. Клієнт знаходить вашого бота в Telegram</p>
              <p>2. Надсилає команду <code className="bg-muted px-1 rounded">/connect</code></p>
              <p>3. Вводить свій номер телефону</p>
              <p>4. Готово! Нагадування будуть приходити автоматично</p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Save button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : saved ? (
          <Check className="h-4 w-4 mr-2" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        {saved ? 'Збережено!' : 'Зберегти'}
      </Button>
    </div>
  );
}
