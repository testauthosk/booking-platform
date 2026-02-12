'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Save,
  ExternalLink,
  Loader2,
  Globe,
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Image as ImageIcon,
  Palette,
  Sparkles,
  Upload,
  X,
  Plus,
  Check,
  CheckCircle2,
  Circle,
  Lightbulb,
  RefreshCw,
  Eye,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Типи
interface SalonSettings {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  shortAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  logo: string | null;
  photos: string[];
  workingHours: WorkingHoursDay[] | null;
  amenities: string[];
  timezone: string;
  currency: string;
  paletteId: string;
  isPublished: boolean;
  servicesCount: number;
  mastersCount: number;
}

interface WorkingHoursDay {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

// Checklist item type
interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  hint?: string;
  detail?: string;
  required?: boolean;
}

// Дні тижня
const DAYS_OF_WEEK = [
  'Понеділок',
  'Вівторок',
  'Середа',
  'Четвер',
  "П'ятниця",
  'Субота',
  'Неділя',
];

// Типи закладів
const BUSINESS_TYPES = [
  'Барбершоп',
  'Салон краси',
  'Перукарня',
  'СПА',
  'Манікюрний салон',
  'Косметологія',
  'Масажний салон',
  'Студія татуювань',
];

// Доступні зручності
const AVAILABLE_AMENITIES = [
  'Wi-Fi',
  'Кава/чай',
  'Парковка',
  'Кондиціонер',
  'Телевізор',
  'Музика',
  'Дитячий куточок',
  'Доступ для інвалідів',
  'Оплата карткою',
  'Зона очікування',
];

// Кольорові палітри — з lib
import { COLOR_PALETTES as LIB_PALETTES } from '@/lib/color-palettes';

export default function WebsiteEditorPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingPalette, setSavingPalette] = useState(false);
  const [settings, setSettings] = useState<SalonSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showChecklist, setShowChecklist] = useState(true);
  // Mobile: checklist collapsed by default
  const [mobileChecklistOpen, setMobileChecklistOpen] = useState(false);

  // Unpublish (delete page) state
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [unpublishStep, setUnpublishStep] = useState<'confirm' | 'otp'>('confirm');
  const [unpublishOtp, setUnpublishOtp] = useState('');
  const [unpublishSending, setUnpublishSending] = useState(false);
  const [unpublishVerifying, setUnpublishVerifying] = useState(false);
  const [unpublishHint, setUnpublishHint] = useState('');
  const [unpublishError, setUnpublishError] = useState('');

  // Track milestone dismissed
  const [milestoneDismissed, setMilestoneDismissed] = useState(false);

  // Refs for tracking progress changes (no confetti, just tracking for color transitions)
  const initialLoadRef = useRef(true);
  const prevMinimumDoneRef = useRef<boolean>(false);
  const prevAllDoneRef = useRef<boolean>(false);

  // Завантаження даних
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/salon/settings');
        if (res.ok) {
          const data = await res.json();
          // Ініціалізуємо workingHours якщо пусто
          if (!data.workingHours || !Array.isArray(data.workingHours)) {
            data.workingHours = DAYS_OF_WEEK.map((day) => ({
              day,
              enabled: day !== 'Неділя',
              start: '09:00',
              end: '18:00',
            }));
          }
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Оновлення поля
  const updateField = useCallback((field: keyof SalonSettings, value: any) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : null));
    setHasChanges(true);
  }, []);

  // Checklist logic — split into minimum (required) and recommended
  const MINIMUM_IDS = ['name', 'services', 'masters'] as const;

  const checklist = useMemo<ChecklistItem[]>(() => {
    if (!settings) return [];

    const hasWorkingHours = Array.isArray(settings.workingHours) &&
      settings.workingHours.some((d) => d.enabled);

    return [
      // ── Minimum (required for publish) ──
      {
        id: 'name',
        label: 'Назва закладу',
        completed: !!settings.name && settings.name.trim().length > 0,
        hint: 'Вкажіть назву вашого закладу',
        required: true,
      },
      {
        id: 'services',
        label: 'Хоча б 1 послуга',
        completed: settings.servicesCount > 0,
        hint: 'Додайте послуги, щоб клієнти могли записатися',
        detail: settings.servicesCount > 0 ? `${settings.servicesCount}` : '0',
        required: true,
      },
      {
        id: 'masters',
        label: 'Хоча б 1 майстер',
        completed: settings.mastersCount > 0,
        hint: 'Додайте майстрів для бронювання',
        detail: settings.mastersCount > 0 ? `${settings.mastersCount}` : '0',
        required: true,
      },
      // ── Recommended (for full completion) ──
      {
        id: 'type',
        label: 'Тип закладу',
        completed: !!settings.type && settings.type.trim().length > 0,
        hint: 'Оберіть тип вашого закладу',
      },
      {
        id: 'contacts',
        label: 'Контакти',
        completed: !!(settings.phone || settings.email),
        hint: 'Додайте телефон або email для зв\'язку з клієнтами',
      },
      {
        id: 'address',
        label: 'Адреса',
        completed: !!settings.address && settings.address.trim().length > 0,
        hint: 'Клієнти зможуть прокласти маршрут до вас',
      },
      {
        id: 'photos',
        label: 'Фото',
        completed: settings.photos.length >= 3,
        hint: 'Додайте мінімум 3 фото для привабливого вигляду',
        detail: `${settings.photos.length}/3`,
      },
      {
        id: 'hours',
        label: 'Години роботи',
        completed: hasWorkingHours,
        hint: 'Вкажіть графік роботи',
      },
    ];
  }, [settings]);

  const minimumItems = checklist.filter((c) => MINIMUM_IDS.includes(c.id as any));
  const recommendedItems = checklist.filter((c) => !MINIMUM_IDS.includes(c.id as any));
  const minimumDone = minimumItems.every((c) => c.completed);
  const completedCount = checklist.filter((c) => c.completed).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // canPublish = minimum items all done
  const canPublish = minimumDone;

  // Track if we should show the milestone celebration banner
  const showMilestoneBanner = minimumDone && !settings?.isPublished && !milestoneDismissed;

  // Visual progress: 0-50% for minimum items, 50-100% for recommended
  const MILESTONE_PERCENT = 50;
  const visualProgress = useMemo(() => {
    if (!minimumDone) {
      const minCompleted = minimumItems.filter((c) => c.completed).length;
      const minTotal = minimumItems.length || 1;
      return Math.round((minCompleted / minTotal) * MILESTONE_PERCENT);
    }
    const recCompleted = recommendedItems.filter((c) => c.completed).length;
    const recTotal = recommendedItems.length || 1;
    return MILESTONE_PERCENT + Math.round((recCompleted / recTotal) * (100 - MILESTONE_PERCENT));
  }, [minimumDone, minimumItems, recommendedItems]);

  // Progress bar color — smooth transition via CSS (green at 100%, green at >=50%, amber otherwise)
  const progressColor = visualProgress === 100
    ? 'bg-green-500'
    : visualProgress >= MILESTONE_PERCENT
      ? 'bg-green-500'
      : 'bg-amber-500';

  // Track progress state changes (for initial load skip)
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      prevMinimumDoneRef.current = minimumDone;
      prevAllDoneRef.current = progressPercent === 100;
      return;
    }
    prevMinimumDoneRef.current = minimumDone;
    prevAllDoneRef.current = progressPercent === 100;
  }, [completedCount, minimumDone, progressPercent]);

  // Збереження
  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/salon/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings((prev) => prev ? { ...prev, ...updated } : null);
        setHasChanges(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Помилка збереження');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  // Publish / Update
  const handlePublish = async () => {
    if (!settings) return;
    setPublishing(true);
    try {
      // First save current changes if any
      const saveData = { ...settings, isPublished: true };
      const res = await fetch('/api/salon/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings((prev) => prev ? { ...prev, ...updated } : null);
        setHasChanges(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Помилка публікації');
      }
    } catch (error) {
      console.error('Failed to publish:', error);
      alert('Помилка публікації');
    } finally {
      setPublishing(false);
    }
  };

  // Unpublish — step 1: send OTP
  const handleUnpublishRequest = async () => {
    setUnpublishSending(true);
    setUnpublishError('');
    try {
      const res = await fetch('/api/salon/unpublish', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setUnpublishHint(data.hint || 'Код відправлено');
        setUnpublishStep('otp');
      } else {
        setUnpublishError(data.error || 'Помилка');
      }
    } catch {
      setUnpublishError("Помилка з'єднання");
    } finally {
      setUnpublishSending(false);
    }
  };

  // Unpublish — step 2: verify OTP
  const handleUnpublishConfirm = async () => {
    if (unpublishOtp.length !== 6) {
      setUnpublishError('Введіть 6-значний код');
      return;
    }
    setUnpublishVerifying(true);
    setUnpublishError('');
    try {
      const res = await fetch('/api/salon/unpublish', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: unpublishOtp }),
      });
      const data = await res.json();
      if (res.ok) {
        setSettings((prev) => prev ? { ...prev, isPublished: false } : null);
        setShowUnpublishModal(false);
        setUnpublishStep('confirm');
        setUnpublishOtp('');
        setUnpublishHint('');
      } else {
        setUnpublishError(data.error || 'Невірний код');
      }
    } catch {
      setUnpublishError("Помилка з'єднання");
    } finally {
      setUnpublishVerifying(false);
    }
  };

  // Зберегти палітру + розподілити кольори між майстрами
  const handlePaletteSave = async () => {
    if (!settings) return;
    setSavingPalette(true);
    try {
      const res = await fetch('/api/salon/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paletteId: settings.paletteId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Помилка збереження');
        return;
      }

      const mastersRes = await fetch('/api/masters');
      if (!mastersRes.ok) return;
      const mastersList = await mastersRes.json();

      const palette = LIB_PALETTES.find((p) => p.id === settings.paletteId);
      if (!palette || !Array.isArray(mastersList) || mastersList.length === 0) {
        setHasChanges(false);
        return;
      }

      const shuffled = [...palette.colors].sort(() => Math.random() - 0.5);
      const updates = mastersList.map((master: { id: string }, idx: number) => {
        const color = shuffled[idx % shuffled.length].hex;
        return fetch(`/api/masters/${master.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ color }),
        });
      });
      await Promise.all(updates);

      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save palette:', error);
      alert('Помилка збереження палітри');
    } finally {
      setSavingPalette(false);
    }
  };

  // Завантаження логотипу
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'logos');
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const { url } = await res.json();
        updateField('logo', url);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Завантаження фото галереї
  const handlePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    const newPhotos: string[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'gallery');
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const { url } = await res.json();
          newPhotos.push(url);
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
    if (newPhotos.length > 0) {
      updateField('photos', [...(settings?.photos || []), ...newPhotos]);
    }
    setUploadingPhotos(false);
  };

  // Видалення фото
  const removePhoto = (index: number) => {
    const newPhotos = [...(settings?.photos || [])];
    newPhotos.splice(index, 1);
    updateField('photos', newPhotos);
  };

  // Оновлення годин роботи
  const updateWorkingHours = (dayIndex: number, field: string, value: any) => {
    const hours = [...(settings?.workingHours || [])];
    hours[dayIndex] = { ...hours[dayIndex], [field]: value };
    updateField('workingHours', hours);
  };

  // Toggle amenity
  const toggleAmenity = (amenity: string) => {
    const current = settings?.amenities || [];
    if (current.includes(amenity)) {
      updateField('amenities', current.filter((a) => a !== amenity));
    } else {
      updateField('amenities', [...current, amenity]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Не вдалося завантажити налаштування</p>
      </div>
    );
  }

  const sections = [
    { id: 'basic', label: 'Основне', icon: Building2 },
    { id: 'contacts', label: 'Контакти', icon: Phone },
    { id: 'media', label: 'Медіа', icon: ImageIcon },
    { id: 'hours', label: 'Години', icon: Clock },
    { id: 'amenities', label: 'Зручності', icon: Sparkles },
    { id: 'theme', label: 'Тема', icon: Palette },
  ];

  // Section-specific hints
  const sectionHints: Record<string, { show: boolean; text: string }> = {
    basic: {
      show: !settings.description || settings.description.trim().length === 0,
      text: '💡 Розкажіть чим ваш заклад особливий — це підвищує довіру',
    },
    contacts: {
      show: !settings.address || settings.address.trim().length === 0,
      text: '💡 Клієнти зможуть прокласти маршрут до вас',
    },
    media: {
      show: settings.photos.length < 3,
      text: `💡 Додайте мінімум 3 фото для привабливого вигляду (${settings.photos.length}/3)`,
    },
    hours: {
      show: !Array.isArray(settings.workingHours) || !settings.workingHours.some((d) => d.enabled),
      text: '💡 Вкажіть графік — клієнти бачитимуть чи ви працюєте зараз',
    },
    amenities: { show: false, text: '' },
    theme: { show: false, text: '' },
  };

  return (
    <div className="min-h-screen bg-gray-50/50 overflow-x-hidden max-w-full">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 lg:h-16">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/setup">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="font-semibold text-base lg:text-lg truncate">Редактор сайту</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Налаштуйте публічну сторінку вашого салону
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {settings.isPublished && (
              <a
                href={`/salon/${settings.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex"
              >
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  Переглянути
                </Button>
              </a>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              size="sm"
              variant="outline"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              <span className="hidden sm:inline">💾 Зберегти чернетку</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* Progress Bar — MOBILE compact version      */}
      {/* ═══════════════════════════════════════════ */}
      <div className="lg:hidden sticky top-14 z-10 bg-white border-b">
        <button
          onClick={() => setMobileChecklistOpen(!mobileChecklistOpen)}
          className="w-full px-4 py-2.5 flex items-center gap-3"
        >
          {/* Icon */}
          {visualProgress === 100 ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          ) : minimumDone ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-gray-400 shrink-0" />
          )}
          {/* Bar */}
          <div className="flex-1 min-w-0">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${progressColor}`}
                style={{ width: `${visualProgress}%` }}
              />
            </div>
          </div>
          {/* Percent */}
          <span className="text-xs font-medium text-gray-500 tabular-nums shrink-0">
            {visualProgress}%
          </span>
          {/* Chevron */}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
              mobileChecklistOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Expandable mobile checklist */}
        {mobileChecklistOpen && (
          <div className="px-4 pb-3 animate-fade-in">
            {/* Milestone celebration — compact mobile */}
            {showMilestoneBanner && (
              <div className="mb-2.5 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200 animate-fade-in">
                <span className="text-base shrink-0 animate-check-in">🎉</span>
                <p className="text-xs font-medium text-green-800 flex-1 min-w-0">
                  Мінімум заповнено! Можна публікувати.
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setMilestoneDismissed(true); }}
                  className="shrink-0 text-green-400 hover:text-green-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Minimum items */}
            <div className="mb-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1 flex items-center gap-1">
                {minimumDone ? (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                ) : (
                  <span className="w-3 h-3 rounded-full border-2 border-amber-400 inline-block" />
                )}
                Обов&apos;язково
              </p>
              <div className="space-y-1">
                {minimumItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 px-2 py-1 rounded-lg text-sm ${
                      item.completed ? 'text-gray-500' : 'text-gray-700 bg-amber-50/60'
                    }`}
                  >
                    {item.completed ? (
                      <div className="animate-check-in">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      </div>
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className={`text-xs ${item.completed ? 'line-through' : 'font-medium'}`}>
                      {item.label}
                    </span>
                    {item.detail && !item.completed && (
                      <span className="text-[10px] text-amber-600 ml-auto font-medium">{item.detail}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended items */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                Рекомендовано
              </p>
              <div className="space-y-1">
                {recommendedItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 px-2 py-1 rounded-lg text-sm ${
                      item.completed ? 'text-gray-500' : 'text-gray-700'
                    }`}
                  >
                    {item.completed ? (
                      <div className="animate-check-in">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      </div>
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    )}
                    <span className={`text-xs ${item.completed ? 'line-through' : ''}`}>
                      {item.label}
                    </span>
                    {item.detail && !item.completed && (
                      <span className="text-[10px] text-gray-500 ml-auto font-medium">{item.detail}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* Progress Bar — DESKTOP full version         */}
      {/* ═══════════════════════════════════════════ */}
      <div className="hidden lg:block sticky top-16 z-10 bg-white border-b shadow-sm">
        <div className="px-4 sm:px-6 py-3">
          {/* Title row */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowChecklist(!showChecklist)}
              className="text-sm font-medium text-gray-700 flex items-center gap-1.5 hover:text-gray-900 transition-colors"
            >
              {visualProgress === 100 ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : minimumDone ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400" />
              )}
              Ваш сайт готовий на {visualProgress}%
            </button>
            <span className="text-xs text-muted-foreground">
              {completedCount}/{totalCount}
            </span>
          </div>

          {/* Two-zone progress bar */}
          <div className="relative">
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${progressColor}`}
                style={{
                  width: `${visualProgress}%`,
                  transition: 'width 0.8s ease, background-color 0.6s ease',
                }}
              />
            </div>
            {/* Milestone marker at 50% */}
            <div
              className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${MILESTONE_PERCENT}%`, transform: `translateX(-50%) translateY(-50%)` }}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center transition-colors duration-500 ${
                  minimumDone ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                {minimumDone && (
                  <Check className="w-2.5 h-2.5 text-white" />
                )}
              </div>
            </div>
            {/* Labels under the bar */}
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-gray-400">Мінімум</span>
              <span
                className="text-[10px] text-gray-400 absolute"
                style={{ left: `${MILESTONE_PERCENT}%`, transform: 'translateX(-50%)' }}
              >
                {minimumDone ? '✓ Готово' : 'Мінімум'}
              </span>
              <span className="text-[10px] text-gray-400">100%</span>
            </div>
          </div>

          {/* Milestone celebration banner — desktop */}
          {showMilestoneBanner && (
            <div className="mt-3 animate-fade-in">
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
                <span className="text-xl shrink-0 animate-check-in">🎉</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800">
                    Мінімум заповнено!
                  </p>
                  <p className="text-xs text-green-700 mt-0.5">
                    Ви можете створити публічну сторінку або продовжити заповнення для кращого результату.
                  </p>
                </div>
                <button
                  onClick={() => setMilestoneDismissed(true)}
                  className="shrink-0 text-green-400 hover:text-green-600 transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Checklist — desktop */}
          {showChecklist && (
            <div className="mt-3 space-y-3">
              {/* Minimum items */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 flex items-center gap-1.5">
                  {minimumDone ? (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  ) : (
                    <span className="w-3 h-3 rounded-full border-2 border-amber-400 inline-block" />
                  )}
                  Обов&apos;язково
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {minimumItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                        item.completed ? 'text-gray-500' : 'text-gray-700 bg-amber-50/60'
                      }`}
                    >
                      {item.completed ? (
                        <div className="animate-check-in">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        </div>
                      ) : (
                        <Circle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span className={item.completed ? 'line-through' : 'font-medium'}>
                        {item.label}
                      </span>
                      {item.detail && !item.completed && (
                        <span className="text-xs text-amber-600 ml-auto font-medium">
                          {item.detail}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended items */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                  Рекомендовано
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {recommendedItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                        item.completed ? 'text-gray-500' : 'text-gray-700 bg-gray-50'
                      }`}
                    >
                      {item.completed ? (
                        <div className="animate-check-in">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        </div>
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                      )}
                      <span className={item.completed ? 'line-through' : ''}>
                        {item.label}
                      </span>
                      {item.detail && !item.completed && (
                        <span className="text-xs text-gray-500 ml-auto font-medium">
                          {item.detail}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Celebration banner when minimum is met but not yet published — DESKTOP only */}
      {canPublish && !settings.isPublished && (
        <div className="hidden lg:block mx-4 sm:mx-6 mt-3 mb-0">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <div className="text-2xl animate-check-in">🎉</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-green-800 text-sm">
                Мінімум заповнено!
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                Ви вже можете створити публічну сторінку або продовжити заповнення для кращого результату
              </p>
            </div>
            <Button
              onClick={handlePublish}
              disabled={publishing}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white shrink-0"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : '🌐 Створити'}
            </Button>
          </div>
        </div>
      )}

      {/* Mobile celebration banner — compact, no button (button is in bottom bar) */}
      {canPublish && !settings.isPublished && (
        <div className="lg:hidden mx-4 mt-3 mb-0">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-3 py-2.5 flex items-center gap-2.5 animate-fade-in">
            <span className="text-lg animate-check-in">🎉</span>
            <p className="text-xs font-medium text-green-800 flex-1 min-w-0">
              Мінімум заповнено! Можна публікувати.
            </p>
          </div>
        </div>
      )}

      <div className="flex overflow-hidden max-w-full">
        {/* Sidebar Navigation */}
        <div className="hidden lg:block w-56 shrink-0 border-r bg-white min-h-[calc(100vh-64px)] sticky top-16">
          <nav className="p-4 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-3xl pb-[180px] lg:pb-8">
          {/* Mobile Section Tabs — horizontal scroll */}
          <div className="lg:hidden mb-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 w-max">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeSection === section.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 border'
                  }`}
                >
                  <section.icon className="w-3.5 h-3.5" />
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section Hint */}
          {sectionHints[activeSection]?.show && (
            <div className="mb-4 flex items-start gap-2.5 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800 break-words">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span className="min-w-0">{sectionHints[activeSection].text}</span>
            </div>
          )}

          {/* Basic Info Section */}
          {activeSection === 'basic' && (
            <Card className="p-4 lg:p-6 max-w-full">
              <h2 className="text-base lg:text-lg font-semibold mb-4 lg:mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-400 shrink-0" />
                <span className="break-words">Основна інформація</span>
              </h2>
              <div className="space-y-4 lg:space-y-6">
                <div>
                  <Label htmlFor="name">Назва закладу</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="The Barber Shop"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="slug">URL адреса (slug)</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Input
                      id="slug"
                      value={settings.slug}
                      onChange={(e) => {
                        const clean = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '')
                          .replace(/-+/g, '-')
                          .substring(0, 30);
                        updateField('slug', clean);
                      }}
                      placeholder="the-barber"
                      className="flex-1 min-w-0"
                    />
                    <span className="text-sm text-muted-foreground shrink-0">.tholim.com</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Латинські літери, цифри та дефіс. Макс. 30 символів.
                  </p>
                </div>

                <div>
                  <Label htmlFor="type">Тип закладу</Label>
                  <select
                    id="type"
                    value={settings.type}
                    onChange={(e) => updateField('type', e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 border rounded-md bg-white text-sm"
                  >
                    {BUSINESS_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="description">Опис</Label>
                  <Textarea
                    id="description"
                    value={settings.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Розкажіть про ваш заклад..."
                    className="mt-1.5 min-h-[120px]"
                  />
                  {(!settings.description || settings.description.trim().length === 0) && (
                    <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      Розкажіть чим ваш заклад особливий — це підвищує довіру
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Contacts Section */}
          {activeSection === 'contacts' && (
            <Card className="p-4 lg:p-6 max-w-full">
              <h2 className="text-base lg:text-lg font-semibold mb-4 lg:mb-6 flex items-center gap-2">
                <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                Контактна інформація
              </h2>
              <div className="space-y-4 lg:space-y-6">
                <div>
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={settings.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+380 XX XXX XX XX"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="hello@salon.com"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Повна адреса</Label>
                  <Input
                    id="address"
                    value={settings.address || ''}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="вул. Хрещатик, 1, Київ, 01001"
                    className="mt-1.5"
                  />
                  {(!settings.address || settings.address.trim().length === 0) && (
                    <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      Клієнти зможуть прокласти маршрут до вас
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="shortAddress">Коротка адреса</Label>
                  <Input
                    id="shortAddress"
                    value={settings.shortAddress || ''}
                    onChange={(e) => updateField('shortAddress', e.target.value)}
                    placeholder="Хрещатик, 1"
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Відображається в заголовку сайту
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:gap-4">
                  <div>
                    <Label htmlFor="latitude">Широта</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={settings.latitude || ''}
                      onChange={(e) => updateField('latitude', parseFloat(e.target.value) || null)}
                      placeholder="50.4501"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Довгота</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={settings.longitude || ''}
                      onChange={(e) => updateField('longitude', parseFloat(e.target.value) || null)}
                      placeholder="30.5234"
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground -mt-2 lg:-mt-4 break-words">
                  Для відображення на карті. Знайдіть координати на{' '}
                  <a
                    href="https://www.google.com/maps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Google Maps
                  </a>
                </p>
              </div>
            </Card>
          )}

          {/* Media Section */}
          {activeSection === 'media' && (
            <Card className="p-4 lg:p-6 max-w-full overflow-hidden">
              <h2 className="text-base lg:text-lg font-semibold mb-4 lg:mb-6 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-gray-400 shrink-0" />
                Медіа
              </h2>
              <div className="space-y-6 lg:space-y-8">
                {/* Logo */}
                <div>
                  <Label>Логотип</Label>
                  <div className="mt-3 flex items-start gap-3 lg:gap-4">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden shrink-0">
                      {settings.logo ? (
                        <Image
                          src={settings.logo}
                          alt="Logo"
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Globe className="w-8 h-8 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label htmlFor="logo-upload">
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          asChild
                          disabled={uploadingLogo}
                        >
                          <span>
                            {uploadingLogo ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            Завантажити
                          </span>
                        </Button>
                      </label>
                      {settings.logo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 text-red-600 hover:text-red-700"
                          onClick={() => updateField('logo', null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Рекомендований розмір: 200x200px
                      </p>
                    </div>
                  </div>
                </div>

                {/* Gallery */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label>Галерея фото</Label>
                    {settings.photos.length < 3 && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                        {settings.photos.length}/3 мінімум
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Перше фото буде головним на сторінці
                  </p>
                  {/* Photo grid — on mobile use horizontal scroll if many photos */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:gap-3">
                    {settings.photos.map((photo, index) => (
                      <div
                        key={index}
                        className="relative aspect-[4/3] rounded-xl overflow-hidden group"
                      >
                        <Image
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          {index === 0 && (
                            <span className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-white/90 text-xs font-medium">
                              Головне
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <label className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:border-gray-300 hover:bg-gray-100 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotosUpload}
                        className="hidden"
                      />
                      {uploadingPhotos ? (
                        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-6 h-6 text-gray-400" />
                          <span className="text-xs text-gray-500 mt-1">Додати</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Working Hours Section */}
          {activeSection === 'hours' && (
            <Card className="p-4 lg:p-6 max-w-full">
              <h2 className="text-base lg:text-lg font-semibold mb-4 lg:mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                Години роботи
              </h2>
              <div className="space-y-2 lg:space-y-3">
                {settings.workingHours?.map((day, index) => (
                  <div
                    key={day.day}
                    className={`flex items-center gap-2 lg:gap-4 p-2.5 lg:p-3 rounded-lg transition-colors ${
                      day.enabled ? 'bg-white border' : 'bg-gray-50'
                    }`}
                  >
                    <Switch
                      checked={day.enabled}
                      onCheckedChange={(checked) => updateWorkingHours(index, 'enabled', checked)}
                    />
                    <span
                      className={`w-20 lg:w-28 text-xs lg:text-sm font-medium shrink-0 ${
                        day.enabled ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {day.day}
                    </span>
                    {day.enabled ? (
                      <div className="flex items-center gap-1.5 lg:gap-2 flex-1 min-w-0">
                        <Input
                          type="time"
                          value={day.start}
                          onChange={(e) => updateWorkingHours(index, 'start', e.target.value)}
                          className="w-[5.5rem] lg:w-28 text-xs lg:text-sm"
                        />
                        <span className="text-gray-400 shrink-0">—</span>
                        <Input
                          type="time"
                          value={day.end}
                          onChange={(e) => updateWorkingHours(index, 'end', e.target.value)}
                          className="w-[5.5rem] lg:w-28 text-xs lg:text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-xs lg:text-sm text-gray-400">Зачинено</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Amenities Section */}
          {activeSection === 'amenities' && (
            <Card className="p-4 lg:p-6 max-w-full">
              <h2 className="text-base lg:text-lg font-semibold mb-4 lg:mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gray-400 shrink-0" />
                Зручності
              </h2>
              <div className="grid grid-cols-2 gap-2 lg:gap-3">
                {AVAILABLE_AMENITIES.map((amenity) => {
                  const isSelected = settings.amenities?.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      className={`flex items-center gap-2 lg:gap-3 p-2.5 lg:p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 lg:w-5 lg:h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-white' : 'border-2 border-gray-300'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-gray-900" />}
                      </div>
                      <span className="text-xs lg:text-sm font-medium break-words min-w-0">{amenity}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Theme Section */}
          {activeSection === 'theme' && (
            <Card className="p-4 lg:p-6 max-w-full">
              <h2 className="text-base lg:text-lg font-semibold mb-4 lg:mb-6 flex items-center gap-2">
                <Palette className="w-5 h-5 text-gray-400 shrink-0" />
                Кольорова тема
              </h2>
              <div className="flex flex-col gap-2 lg:gap-3">
                {LIB_PALETTES.map((palette) => {
                  const isSelected = settings.paletteId === palette.id;
                  return (
                    <button
                      key={palette.id}
                      onClick={() => updateField('paletteId', palette.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-gray-900 bg-gray-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex gap-1 shrink-0">
                        {palette.colors.map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color.hex }}
                          />
                        ))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{palette.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{palette.description}</p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-gray-900 shrink-0 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Save palette + distribute colors */}
              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={handlePaletteSave}
                  disabled={!hasChanges || savingPalette}
                  className="w-full"
                  size="sm"
                >
                  {savingPalette ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Зберегти та розподілити кольори
                </Button>
                <p className="text-[11px] text-gray-400 mt-2 text-center">
                  Кольори будуть випадково розподілені між майстрами
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Preview Panel */}
        <div className="hidden xl:block w-[420px] shrink-0 border-l bg-gray-100 min-h-[calc(100vh-64px)] sticky top-16">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">Попередній перегляд</span>
              <a
                href={`/salon/${settings.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                Відкрити
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <iframe
                src={`/salon/${settings.slug}?preview=true`}
                className="w-full h-[600px] border-0"
                title="Preview"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar — publish / save */}
      <div className="lg:hidden fixed bottom-[68px] left-0 right-0 bg-white border-t z-30 safe-area-bottom">
        <div className="flex items-center gap-2 px-4 py-3">
          {/* Save draft */}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            variant="outline"
            className="flex-1"
            size="sm"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            💾 Зберегти чернетку
          </Button>

          {/* Publish / Update */}
          {!settings.isPublished ? (
            <Button
              onClick={handlePublish}
              disabled={!canPublish || publishing}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white animate-pulse-glow"
              size="sm"
            >
              {publishing ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Globe className="w-4 h-4 mr-1.5" />
              )}
              Опублікувати
            </Button>
          ) : (
            <>
              <Button
                onClick={handlePublish}
                disabled={publishing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {publishing ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                )}
                Оновити
              </Button>
              <a
                href={`/salon/${settings.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
              </a>
              <Button
                onClick={() => { setShowUnpublishModal(true); setUnpublishStep('confirm'); setUnpublishError(''); setUnpublishOtp(''); }}
                variant="outline"
                size="sm"
                className="text-red-500 border-red-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Desktop Bottom Publish Bar */}
      <div className="hidden lg:block fixed bottom-0 left-56 right-0 xl:right-[420px] bg-white border-t z-30">
        <div className="flex items-center justify-between px-8 py-3 max-w-3xl">
          <div className="flex items-center gap-3">
            {settings.isPublished ? (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Сторінка опублікована
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {canPublish
                  ? 'Готово до публікації'
                  : 'Заповніть мінімум: назва, 1 послуга, 1 майстер'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              variant="outline"
              size="sm"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              💾 Зберегти чернетку
            </Button>
            {!settings.isPublished ? (
              <Button
                onClick={handlePublish}
                disabled={!canPublish || publishing}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                {publishing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4 mr-2" />
                )}
                🌐 Створити публічну сторінку
              </Button>
            ) : (
              <>
                <Button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {publishing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  🔄 Оновити дані
                </Button>
                <a
                  href={`/salon/${settings.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    👁 Переглянути
                  </Button>
                </a>
                <Button
                  onClick={() => { setShowUnpublishModal(true); setUnpublishStep('confirm'); setUnpublishError(''); setUnpublishOtp(''); }}
                  variant="outline"
                  size="sm"
                  className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  🗑 Видалити
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Unpublish Confirmation Modal */}
      {showUnpublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in">
            {unpublishStep === 'confirm' ? (
              <div className="p-5 lg:p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
                  Видалити публічну сторінку?
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6 break-words">
                  Ваш сайт <b>{settings.slug}.tholim.com</b> стане недоступним для клієнтів. Дані залишаться — ви зможете опублікувати знову.
                </p>
                {unpublishError && (
                  <p className="text-sm text-red-500 text-center mb-4">{unpublishError}</p>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowUnpublishModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Скасувати
                  </Button>
                  <Button
                    onClick={handleUnpublishRequest}
                    disabled={unpublishSending}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  >
                    {unpublishSending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Підтвердити
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-5 lg:p-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔐</span>
                </div>
                <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
                  Введіть код підтвердження
                </h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  {unpublishHint}
                </p>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={unpublishOtp}
                  onChange={(e) => {
                    setUnpublishOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setUnpublishError('');
                  }}
                  className="text-center text-2xl tracking-[0.5em] font-mono mb-4"
                  autoFocus
                />
                {unpublishError && (
                  <p className="text-sm text-red-500 text-center mb-4">{unpublishError}</p>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={() => { setUnpublishStep('confirm'); setUnpublishError(''); }}
                    variant="outline"
                    className="flex-1"
                  >
                    Назад
                  </Button>
                  <Button
                    onClick={handleUnpublishConfirm}
                    disabled={unpublishVerifying || unpublishOtp.length !== 6}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  >
                    {unpublishVerifying ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Видалити сторінку
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
