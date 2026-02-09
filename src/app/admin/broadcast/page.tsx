'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Send,
  MessageCircle,
  Mail,
  Users,
  Store,
  AlertTriangle,
  Check,
  Loader2,
} from 'lucide-react';

interface Salon {
  id: string;
  name: string;
}

interface AudiencePreview {
  count: number;
  recipients: Array<{ id: string; name: string | null; email: string | null; telegramChatId: string | null }>;
  hasMore: boolean;
}

export default function BroadcastPage() {
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [channel, setChannel] = useState<'telegram' | 'email'>('telegram');
  const [audience, setAudience] = useState<'all_owners' | 'all_telegram' | 'salon'>('all_owners');
  const [salonId, setSalonId] = useState('');
  const [salons, setSalons] = useState<Salon[]>([]);
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  useEffect(() => {
    fetchSalons();
  }, []);

  useEffect(() => {
    if (audience && channel) {
      fetchPreview();
    }
  }, [audience, channel, salonId]);

  const fetchSalons = async () => {
    try {
      const res = await fetch('/api/admin/salons');
      if (res.ok) {
        const data = await res.json();
        setSalons(data);
      }
    } catch (error) {
      console.error('Error fetching salons:', error);
    }
  };

  const fetchPreview = async () => {
    setPreviewLoading(true);
    try {
      const params = new URLSearchParams({
        audience,
        channel,
      });
      if (salonId) params.set('salonId', salonId);

      const res = await fetch(`/api/admin/broadcast?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      alert('Введіть текст повідомлення');
      return;
    }

    if (!preview || preview.count === 0) {
      alert('Немає отримувачів');
      return;
    }

    if (!confirm(`Надіслати повідомлення ${preview.count} отримувачам?`)) {
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          subject: channel === 'email' ? subject : undefined,
          audience,
          channel,
          salonId: audience === 'salon' ? salonId : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        if (data.sent > 0) {
          setMessage('');
          setSubject('');
        }
      } else {
        const error = await res.json();
        alert(error.error || 'Помилка відправки');
      }
    } catch (error) {
      console.error('Error sending broadcast:', error);
      alert('Помилка відправки');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Broadcast</h1>
        <p className="text-gray-400 text-sm">Масова розсилка повідомлень</p>
      </div>

      {/* Warning */}
      <Card className="bg-amber-500/10 border-amber-500/20 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-400">Увага!</p>
            <p className="text-sm text-amber-300/80">
              Broadcast повідомлення надсилаються всім обраним отримувачам одразу. 
              Переконайтеся, що текст коректний перед відправкою.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Form */}
        <Card className="bg-[#12121a] border-white/5 p-4 space-y-4">
          <h3 className="font-medium text-white">Налаштування</h3>

          {/* Channel */}
          <div className="space-y-2">
            <Label className="text-gray-400">Канал</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setChannel('telegram')}
                className={`p-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                  channel === 'telegram'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                    : 'border-white/10 text-gray-400 hover:bg-white/5'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                Telegram
              </button>
              <button
                onClick={() => setChannel('email')}
                className={`p-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                  channel === 'email'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-white/10 text-gray-400 hover:bg-white/5'
                }`}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>
          </div>

          {/* Audience */}
          <div className="space-y-2">
            <Label className="text-gray-400">Аудиторія</Label>
            <div className="space-y-2">
              <button
                onClick={() => setAudience('all_owners')}
                className={`w-full p-3 rounded-lg border transition-colors flex items-center gap-2 ${
                  audience === 'all_owners'
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-white/10 hover:bg-white/5'
                }`}
              >
                <Users className={`w-4 h-4 ${audience === 'all_owners' ? 'text-violet-400' : 'text-gray-500'}`} />
                <span className={audience === 'all_owners' ? 'text-white' : 'text-gray-400'}>
                  Всі власники салонів
                </span>
              </button>
              <button
                onClick={() => setAudience('all_telegram')}
                className={`w-full p-3 rounded-lg border transition-colors flex items-center gap-2 ${
                  audience === 'all_telegram'
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-white/10 hover:bg-white/5'
                }`}
              >
                <MessageCircle className={`w-4 h-4 ${audience === 'all_telegram' ? 'text-violet-400' : 'text-gray-500'}`} />
                <span className={audience === 'all_telegram' ? 'text-white' : 'text-gray-400'}>
                  Всі користувачі з Telegram
                </span>
              </button>
              <button
                onClick={() => setAudience('salon')}
                className={`w-full p-3 rounded-lg border transition-colors flex items-center gap-2 ${
                  audience === 'salon'
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-white/10 hover:bg-white/5'
                }`}
              >
                <Store className={`w-4 h-4 ${audience === 'salon' ? 'text-violet-400' : 'text-gray-500'}`} />
                <span className={audience === 'salon' ? 'text-white' : 'text-gray-400'}>
                  Клієнти конкретного салону
                </span>
              </button>
            </div>
          </div>

          {/* Salon selector */}
          {audience === 'salon' && (
            <div className="space-y-2">
              <Label className="text-gray-400">Салон</Label>
              <select
                value={salonId}
                onChange={(e) => setSalonId(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                <option value="">Оберіть салон</option>
                {salons.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Subject (email only) */}
          {channel === 'email' && (
            <div className="space-y-2">
              <Label className="text-gray-400">Тема листа</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Важливе повідомлення"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label className="text-gray-400">Повідомлення</Label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={channel === 'telegram' 
                ? "Привіт! 👋\n\nПідтримуються <b>HTML теги</b> для Telegram."
                : "Привіт!\n\nТекст вашого повідомлення..."
              }
              className="w-full h-40 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 resize-none"
            />
            {channel === 'telegram' && (
              <p className="text-xs text-gray-500">
                HTML теги: &lt;b&gt;жирний&lt;/b&gt;, &lt;i&gt;курсив&lt;/i&gt;, &lt;code&gt;код&lt;/code&gt;
              </p>
            )}
          </div>
        </Card>

        {/* Preview */}
        <Card className="bg-[#12121a] border-white/5 p-4 space-y-4">
          <h3 className="font-medium text-white">Прев'ю</h3>

          {/* Recipients count */}
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Отримувачів:</span>
              {previewLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              ) : (
                <span className="text-2xl font-bold text-white">{preview?.count || 0}</span>
              )}
            </div>
          </div>

          {/* Recipients preview */}
          {preview && preview.recipients.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Перші отримувачі:</p>
              <div className="space-y-1">
                {preview.recipients.map((r) => (
                  <div key={r.id} className="px-3 py-2 bg-white/5 rounded text-sm">
                    <p className="text-white">{r.name || r.email || 'Без імені'}</p>
                    <p className="text-xs text-gray-500">
                      {channel === 'telegram' ? r.telegramChatId : r.email}
                    </p>
                  </div>
                ))}
                {preview.hasMore && (
                  <p className="text-xs text-gray-500 text-center py-1">
                    ... та ще {preview.count - preview.recipients.length}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Message preview */}
          {message && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Повідомлення:</p>
              <div className={`p-3 rounded-lg ${
                channel === 'telegram' 
                  ? 'bg-[#1e3a5f]' 
                  : 'bg-white/5'
              }`}>
                {channel === 'email' && subject && (
                  <p className="font-medium text-white mb-2">{subject}</p>
                )}
                <p className="text-sm text-white whitespace-pre-wrap" 
                   dangerouslySetInnerHTML={{ __html: channel === 'telegram' ? message : message.replace(/\n/g, '<br>') }} />
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg ${result.failed === 0 ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Check className={`w-5 h-5 ${result.failed === 0 ? 'text-green-400' : 'text-amber-400'}`} />
                <span className={`font-medium ${result.failed === 0 ? 'text-green-400' : 'text-amber-400'}`}>
                  Розсилка завершена
                </span>
              </div>
              <p className="text-sm text-gray-300">
                Надіслано: {result.sent} / {result.total}
                {result.failed > 0 && <span className="text-red-400"> (помилок: {result.failed})</span>}
              </p>
            </div>
          )}

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={sending || !message.trim() || !preview || preview.count === 0}
            className="w-full bg-violet-600 hover:bg-violet-700"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Надсилання...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Надіслати {preview?.count || 0} отримувачам
              </>
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
}
