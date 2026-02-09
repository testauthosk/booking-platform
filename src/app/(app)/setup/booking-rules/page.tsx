// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, Clock, CalendarDays, Timer, Shield, AlertTriangle, Ban } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BookingRules {
  minLeadTimeHours: number;
  maxAdvanceDays: number;
  slotStepMinutes: number;
  requireConfirmation: boolean;
  bookingWarningText: string | null;
  cancelDeadlineHours: number;
  noShowPenaltyPercent: number;
  maxNoShowsBeforeBlock: number;
}

const LEAD_TIME_OPTIONS = [
  { value: 0, label: 'Без обмежень' },
  { value: 1, label: '1 година' },
  { value: 2, label: '2 години' },
  { value: 4, label: '4 години' },
  { value: 12, label: '12 годин' },
  { value: 24, label: '24 години' },
  { value: 48, label: '48 годин' },
];

const ADVANCE_DAYS_OPTIONS = [
  { value: 7, label: '1 тиждень' },
  { value: 14, label: '2 тижні' },
  { value: 30, label: '1 місяць' },
  { value: 60, label: '2 місяці' },
  { value: 90, label: '3 місяці' },
];

const SLOT_STEP_OPTIONS = [
  { value: 10, label: '10 хв' },
  { value: 15, label: '15 хв' },
  { value: 20, label: '20 хв' },
  { value: 30, label: '30 хв' },
  { value: 60, label: '1 година' },
];

const CANCEL_DEADLINE_OPTIONS = [
  { value: 0, label: 'У будь-який час' },
  { value: 2, label: 'За 2 години' },
  { value: 4, label: 'За 4 години' },
  { value: 6, label: 'За 6 годин' },
  { value: 12, label: 'За 12 годин' },
  { value: 24, label: 'За 24 години' },
];

const NO_SHOW_BLOCK_OPTIONS = [
  { value: 0, label: 'Не блокувати' },
  { value: 2, label: 'Після 2 неявок' },
  { value: 3, label: 'Після 3 неявок' },
  { value: 5, label: 'Після 5 неявок' },
];

export default function BookingRulesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rules, setRules] = useState<BookingRules | null>(null);

  useEffect(() => {
    fetch('/api/settings/booking-rules')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setRules(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!rules) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/settings/booking-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!rules) {
    return <div className="p-6 text-center text-gray-400">Помилка завантаження</div>;
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
          <h1 className="text-xl font-semibold">Правила онлайн-запису</h1>
          <p className="text-sm text-gray-500">Контролюйте як клієнти бронюють час</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Booking time rules ── */}
        <Card className="p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="font-medium">Час бронювання</h2>
          </div>

          {/* Min lead time */}
          <div>
            <label className="text-sm font-medium text-gray-700">Мінімальний час до запису</label>
            <p className="text-xs text-gray-500 mb-2">За скільки часу клієнт може записатися</p>
            <select
              value={rules.minLeadTimeHours}
              onChange={e => setRules({ ...rules, minLeadTimeHours: Number(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {LEAD_TIME_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Max advance */}
          <div>
            <label className="text-sm font-medium text-gray-700">Максимум наперед</label>
            <p className="text-xs text-gray-500 mb-2">На скільки днів наперед доступний запис</p>
            <select
              value={rules.maxAdvanceDays}
              onChange={e => setRules({ ...rules, maxAdvanceDays: Number(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {ADVANCE_DAYS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Slot step */}
          <div>
            <label className="text-sm font-medium text-gray-700">Крок часових слотів</label>
            <p className="text-xs text-gray-500 mb-2">Інтервал між доступними часами для запису</p>
            <div className="flex flex-wrap gap-2">
              {SLOT_STEP_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setRules({ ...rules, slotStepMinutes: o.value })}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    rules.slotStepMinutes === o.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* ── Confirmation ── */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            <h2 className="font-medium">Підтвердження</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Ручне підтвердження записів</p>
              <p className="text-xs text-gray-500">Нові записи потребуватимуть вашого підтвердження</p>
            </div>
            <button
              onClick={() => setRules({ ...rules, requireConfirmation: !rules.requireConfirmation })}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                rules.requireConfirmation ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                rules.requireConfirmation ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>

          {/* Warning text */}
          <div>
            <label className="text-sm font-medium text-gray-700">Попередження при бронюванні</label>
            <p className="text-xs text-gray-500 mb-2">Текст що бачить клієнт перед підтвердженням запису</p>
            <textarea
              value={rules.bookingWarningText || ''}
              onChange={e => setRules({ ...rules, bookingWarningText: e.target.value })}
              placeholder="Наприклад: Запис підтверджується протягом 30 хвилин"
              rows={2}
              maxLength={500}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </Card>

        {/* ── Cancellation policy ── */}
        <Card className="p-5 space-y-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="font-medium">Політика скасування</h2>
          </div>

          {/* Cancel deadline */}
          <div>
            <label className="text-sm font-medium text-gray-700">Дедлайн скасування</label>
            <p className="text-xs text-gray-500 mb-2">До якого моменту клієнт може скасувати безкоштовно</p>
            <select
              value={rules.cancelDeadlineHours}
              onChange={e => setRules({ ...rules, cancelDeadlineHours: Number(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {CANCEL_DEADLINE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* No-show penalty */}
          <div>
            <label className="text-sm font-medium text-gray-700">Штраф за неявку</label>
            <p className="text-xs text-gray-500 mb-2">Відсоток від вартості послуги (0 = без штрафу)</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={rules.noShowPenaltyPercent}
                onChange={e => setRules({ ...rules, noShowPenaltyPercent: Number(e.target.value) })}
                className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>

          {/* Auto-block after N no-shows */}
          <div>
            <label className="text-sm font-medium text-gray-700">Автоблокування</label>
            <p className="text-xs text-gray-500 mb-2">Заблокувати клієнта після кількох неявок</p>
            <select
              value={rules.maxNoShowsBeforeBlock}
              onChange={e => setRules({ ...rules, maxNoShowsBeforeBlock: Number(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {NO_SHOW_BLOCK_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Save button */}
        <Button
          onClick={save}
          disabled={saving}
          className="w-full"
        >
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
