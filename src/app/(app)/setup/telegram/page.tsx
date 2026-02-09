// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Copy, ExternalLink, Send } from 'lucide-react';
import Link from 'next/link';

export default function TelegramSetupPage() {
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [salonSlug, setSalonSlug] = useState('');

  useEffect(() => {
    // Bot username from env
    const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT;
    setBotUsername(bot || null);

    fetch('/api/salon/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.slug) setSalonSlug(data.slug);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const botLink = botUsername ? `https://t.me/${botUsername}` : null;
  const clientDeepLink = botUsername && salonSlug
    ? `https://t.me/${botUsername}?start=salon_${salonSlug}`
    : null;

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const sendTest = async () => {
    setTestLoading(true);
    try {
      // Just test the bot is accessible
      const res = await fetch(`https://api.telegram.org/bot${process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN}/getMe`);
      setTestSent(res.ok);
    } catch {
      setTestSent(false);
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

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
          <h1 className="text-xl font-semibold">Telegram-бот</h1>
          <p className="text-sm text-gray-500">Сповіщення клієнтам через Telegram</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Status */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            {botUsername ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
            <div>
              <p className="font-medium">
                {botUsername ? 'Бот підключено' : 'Бот не налаштовано'}
              </p>
              {botUsername && (
                <p className="text-sm text-gray-500">@{botUsername}</p>
              )}
            </div>
          </div>

          {botLink && (
            <a
              href={botLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Відкрити бота
            </a>
          )}
        </Card>

        {/* Client link */}
        {clientDeepLink && (
          <Card className="p-5 space-y-3">
            <h2 className="font-medium">Посилання для клієнтів</h2>
            <p className="text-xs text-gray-500">
              Поділіться цим посиланням щоб клієнти підписались на сповіщення
            </p>

            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
              <code className="text-sm text-gray-700 flex-1 truncate">{clientDeepLink}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyLink(clientDeepLink)}
              >
                {copied ? '✓' : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <p className="text-xs text-gray-400">
              Клієнт натискає → запускає бота → отримує нагадування про записи
            </p>
          </Card>
        )}

        {/* How it works */}
        <Card className="p-5 space-y-3">
          <h2 className="font-medium">Як це працює</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <p>Клієнт записується на послугу на вашій сторінці</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <p>Після запису бачить кнопку «Підписатись на сповіщення в Telegram»</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <p>Натискає → відкривається бот → клієнт отримує нагадування перед візитом</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <p>Вам приходить сповіщення про новий запис</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
