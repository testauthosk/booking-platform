'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import confetti from 'canvas-confetti';
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
  'Медичний центр',
  'Інше',
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

  // Address autocomplete (Nominatim / OpenStreetMap)
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const addressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // (milestone removed — linear progress now)

  // ── Confetti (canvas-confetti) ──
  const savedProgressRef = useRef({ completed: 0, allDone: false });

  // Custom business type dropdown
  const [businessTypeOpen, setBusinessTypeOpen] = useState(false);
  const businessTypeRef = useRef<HTMLDivElement>(null);

  // Glass tabs refs for mobile
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });

  // Завантаження даних
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/salon/settings');
        if (res.ok) {
          const data = await res.json();
          // Ініціалізуємо workingHours якщо пусто
          if (!data.workingHours || !Array.isArray(data.workingHours) || data.workingHours.length === 0) {
            data.workingHours = DAYS_OF_WEEK.map((day) => ({
              day,
              enabled: false,
              start: '',
              end: '',
            }));
          }
          setSettings(data);
          // Init confetti baseline from server state
          const hasHrs = Array.isArray(data.workingHours) &&
            data.workingHours.some((d: any) => d.enabled && d.start && d.end && d.start !== d.end);
          const initCompleted = [
            data.name && data.name.trim().length >= 2,
            data.servicesCount > 0,
            data.mastersCount > 0,
            data.type && data.type.trim().length > 0,
            data.phone || data.email,
            data.address && data.address.trim().length > 0,
            data.photos?.length >= 3,
            hasHrs,
          ].filter(Boolean).length;
          savedProgressRef.current = {
            completed: initCompleted,
            allDone: initCompleted === 8,
          };
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Close business type dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (businessTypeRef.current && !businessTypeRef.current.contains(e.target as Node)) {
        setBusinessTypeOpen(false);
      }
    }
    if (businessTypeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [businessTypeOpen]);

  // Оновлення поля
  const updateField = useCallback((field: keyof SalonSettings, value: any) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : null));
    setHasChanges(true);
  }, []);

  // Checklist logic — linear progress

  const checklist = useMemo<ChecklistItem[]>(() => {
    if (!settings) return [];

    const hasWorkingHours = Array.isArray(settings.workingHours) &&
      settings.workingHours.some((d) => d.enabled && d.start && d.end && d.start !== d.end);

    return [
      // ── Minimum (required for publish) ──
      {
        id: 'name',
        label: 'Назва закладу',
        completed: !!settings.name && settings.name.trim().length >= 2,
        hint: 'Вкажіть назву (мінімум 2 символи)',
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

  const completedCount = checklist.filter((c) => c.completed).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // canPublish = name + at least 1 service + at least 1 master
  const canPublish = !!(settings?.name && settings.name.trim().length >= 2) && (settings?.servicesCount ?? 0) > 0 && (settings?.mastersCount ?? 0) > 0;

  // Linear progress color
  const progressColor = progressPercent === 100 ? 'bg-green-500' : progressPercent >= 50 ? 'bg-green-500' : 'bg-amber-500';

  // ── Confetti: fire green celebration after successful save ──
  const curProgressRef = useRef({ completedCount, progressPercent });
  curProgressRef.current = { completedCount, progressPercent };

  const fireConfetti = useCallback(() => {
    const saved = savedProgressRef.current;
    const cur = curProgressRef.current;

    const greenColors = ['#22c55e', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

    if (cur.progressPercent === 100 && !saved.allDone) {
      // BIG — reached 100%
      const end = Date.now() + 2000;
      const frame = () => {
        confetti({ particleCount: 4, angle: 60, spread: 80, origin: { x: 0, y: 0.6 }, colors: greenColors });
        confetti({ particleCount: 4, angle: 120, spread: 80, origin: { x: 1, y: 0.6 }, colors: greenColors });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } else if (cur.completedCount > saved.completed) {
      // Progress grew — celebrate
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: greenColors });
    } else if (cur.completedCount > 0) {
      // Same progress but saved something — small burst
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 }, colors: greenColors });
    }

    // Update baseline
    savedProgressRef.current = {
      completed: cur.completedCount,
      allDone: cur.progressPercent === 100,
    };
  }, []);

  // ── Glass tabs: measure active tab position ──
  const updateTabIndicator = useCallback((sectionId?: string) => {
    const container = tabsContainerRef.current;
    if (!container) return;
    // Find sections array index — but sections is defined in render. Use a data attribute approach.
    const targetId = sectionId || activeSection;
    const tabEl = container.querySelector(`[data-tab-id="${targetId}"]`) as HTMLElement | null;
    if (tabEl) {
      setTabIndicator({
        left: tabEl.offsetLeft,
        width: tabEl.offsetWidth,
      });
    }
  }, [activeSection]);

  // Update indicator when activeSection changes or on mount
  useEffect(() => {
    // Small delay to allow DOM to settle
    const timer = setTimeout(() => updateTabIndicator(), 50);
    return () => clearTimeout(timer);
  }, [activeSection, updateTabIndicator, loading, settings]);

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
        // Wait a tick so React updates checklist, then fire confetti
        setTimeout(() => fireConfetti(), 50);
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
        setTimeout(() => fireConfetti(), 50);
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

  const hasValidHours = Array.isArray(settings.workingHours) &&
    settings.workingHours.some((d: any) => d.enabled && d.start && d.end && d.start !== d.end);

  const sections = [
    { id: 'basic', label: 'Основне', icon: Building2, done: !!settings.name && settings.name.trim().length >= 2 && !!settings.type },
    { id: 'contacts', label: 'Контакти', icon: Phone, done: !!(settings.phone || settings.email) && !!settings.address },
    { id: 'media', label: 'Медіа', icon: ImageIcon, done: settings.photos.length >= 3 },
    { id: 'hours', label: 'Години', icon: Clock, done: hasValidHours },
    { id: 'amenities', label: 'Зручності', icon: Sparkles, done: (settings.amenities?.length ?? 0) > 0 },
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
  };

  return (
    <div className="min-h-screen bg-gray-50/50 overflow-x-hidden max-w-full">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 lg:h-16">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/setup">
              <Button variant="outline" size="icon" className="shrink-0 rounded-xl border-gray-200 hover:bg-gray-50">
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
          {/* Header save button removed — save is in bottom bar */}
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
          {progressPercent === 100 ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-gray-400 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${progressColor}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-medium text-gray-500 tabular-nums shrink-0">
            {progressPercent}%
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
              mobileChecklistOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {mobileChecklistOpen && (
          <div className="px-4 pb-3 animate-fade-in">
            <div className="space-y-1">
              {checklist.map((item) => (
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
        )}

        {/* Mobile Section Tabs — inside sticky bar */}
        <div className="overflow-x-auto scrollbar-hide px-3 pb-2">
          <div
            ref={tabsContainerRef}
            className="relative bg-gray-100/80 rounded-2xl p-1 flex w-max min-w-full"
          >
            {/* Animated glass indicator */}
            <div
              className="absolute top-1 bottom-1 rounded-lg backdrop-blur-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-white/50 pointer-events-none"
              style={{
                left: `${tabIndicator.left}px`,
                width: `${tabIndicator.width}px`,
                transition: 'left 0.3s ease, width 0.3s ease',
                background: sections.find((s) => s.id === activeSection)?.done
                  ? 'rgba(240, 253, 244, 0.7)'
                  : 'rgba(255, 255, 255, 0.7)',
              }}
            />
            {sections.map((section, idx) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  data-tab-id={section.id}
                  ref={(el) => { tabRefs.current[idx] = el; }}
                  onClick={() => {
                    setActiveSection(section.id);
                    const container = tabsContainerRef.current;
                    const tabEl = container?.querySelector(`[data-tab-id="${section.id}"]`) as HTMLElement | null;
                    if (tabEl) {
                      setTabIndicator({ left: tabEl.offsetLeft, width: tabEl.offsetWidth });
                    }
                  }}
                  className={`relative z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors duration-200 ${
                    isActive
                      ? 'font-semibold text-gray-900'
                      : section.done
                        ? 'text-green-600'
                        : 'text-gray-600'
                  }`}
                >
                  {section.done && !isActive ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <section.icon className="w-3.5 h-3.5" />
                  )}
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop progress bar removed — checklist is in right sidebar */}

      {/* Banner at 100% — not yet published */}
      {progressPercent === 100 && !settings.isPublished && (
        <div className="mx-4 sm:mx-6 mt-3 mb-0">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 flex items-center gap-2.5 lg:gap-3 animate-fade-in">
            <span className="text-lg lg:text-2xl animate-check-in">🎉</span>
            <p className="text-xs lg:text-sm font-medium text-green-800 flex-1 min-w-0">
              Сайт повністю заповнений! Можна публікувати.
            </p>
            <Button
              onClick={handlePublish}
              disabled={publishing}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white shrink-0 hidden lg:flex"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : '🌐 Створити'}
            </Button>
          </div>
        </div>
      )}

      <div className="flex overflow-hidden max-w-full">
        {/* Sidebar Navigation — Desktop — sliding indicator */}
        <div className="hidden lg:block w-56 shrink-0 border-r bg-background min-h-[calc(100vh-64px)] sticky top-16">
          <nav className="relative p-4 space-y-1">
            {/* Sliding indicator — follows active section */}
            <div
              className="absolute left-4 right-4 rounded-lg bg-primary/10 pointer-events-none"
              style={{
                top: `${16 + sections.findIndex(s => s.id === activeSection) * 44}px`,
                height: '40px',
                transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`relative z-10 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-200 active:scale-[0.98] ${
                  activeSection === section.id
                    ? 'text-primary font-medium'
                    : section.done
                      ? 'text-green-700 hover:bg-muted'
                      : 'text-gray-600 hover:bg-muted'
                }`}
              >
                {section.done && activeSection !== section.id ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <section.icon className="w-4 h-4" />
                )}
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-[180px] lg:pb-16">
          {/* Section hint — mobile only (desktop has right sidebar) */}
          {sectionHints[activeSection]?.show && (
            <div className="mb-4 lg:hidden flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800 break-words">
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
                    onChange={(e) => {
                      const val = e.target.value;
                      updateField('name', val);
                      // Auto-generate slug from name (transliterate cyrillic)
                      const translitMap: Record<string, string> = {
                        а:'a',б:'b',в:'v',г:'h',ґ:'g',д:'d',е:'e',є:'ye',ж:'zh',з:'z',и:'y',і:'i',ї:'yi',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ь:'',ю:'yu',я:'ya',э:'e',ы:'y',ъ:'',ё:'yo',
                      };
                      const slug = val.toLowerCase().split('').map(c => translitMap[c] ?? c).join('')
                        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 30);
                      updateField('slug', slug);
                    }}
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

                {/* Custom business type dropdown */}
                <div>
                  <Label htmlFor="type">Тип закладу</Label>
                  <div ref={businessTypeRef} className="relative mt-1.5">
                    <button
                      type="button"
                      onClick={() => setBusinessTypeOpen(!businessTypeOpen)}
                      className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-white text-sm text-left hover:border-gray-400 transition-colors"
                    >
                      <span className={settings.type ? 'text-gray-900' : 'text-gray-400'}>
                        {settings.type || 'Оберіть тип закладу'}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                          businessTypeOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {businessTypeOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto py-1">
                        {BUSINESS_TYPES.map((type) => {
                          const isSelected = settings.type === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                updateField('type', type);
                                setBusinessTypeOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                                isSelected
                                  ? 'bg-gray-50 text-gray-900 font-medium'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span>{type}</span>
                              {isSelected && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
                  <div className="flex items-center gap-0 mt-1.5">
                    <span className="inline-flex items-center px-3 h-10 rounded-l-md border border-r-0 bg-gray-50 text-sm text-gray-600 select-none shrink-0">+380</span>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      value={(settings.phone || '').replace(/^\+?3?8?0?/, '').replace(/\D/g, '').replace(/(\d{2})(\d{3})?(\d{2})?(\d{2})?/, (_, a, b, c, d) => [a, b, c, d].filter(Boolean).join(' ')).trim()}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                        updateField('phone', digits ? `+380${digits}` : null);
                      }}
                      placeholder="12 345 67 89"
                      className="rounded-l-none"
                      maxLength={12}
                    />
                  </div>
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

                <div className="relative">
                  <Label htmlFor="address">Повна адреса</Label>
                  <Input
                    id="address"
                    value={settings.address || ''}
                    onChange={(e) => {
                      updateField('address', e.target.value);
                      const q = e.target.value.trim();
                      if (addressTimeoutRef.current) clearTimeout(addressTimeoutRef.current);
                      if (q.length < 3) { setAddressSuggestions([]); setShowAddressSuggestions(false); return; }
                      addressTimeoutRef.current = setTimeout(async () => {
                        try {
                          const res = await fetch(
                            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`,
                            { headers: { 'Accept-Language': 'uk,en' } }
                          );
                          const data = await res.json();
                          setAddressSuggestions(data);
                          setShowAddressSuggestions(data.length > 0);
                        } catch { setAddressSuggestions([]); }
                      }, 400);
                    }}
                    onFocus={() => { if (addressSuggestions.length > 0) setShowAddressSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
                    placeholder="вул. Хрещатик, 1, Київ"
                    className="mt-1.5"
                    autoComplete="off"
                  />
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {addressSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0 truncate"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            updateField('address', s.display_name);
                            updateField('latitude', parseFloat(s.lat));
                            updateField('longitude', parseFloat(s.lon));
                            // Auto-fill short address (city + street part)
                            const parts = s.display_name.split(',');
                            if (parts.length >= 2) {
                              updateField('shortAddress', parts.slice(0, 2).join(',').trim());
                            }
                            setShowAddressSuggestions(false);
                            setAddressSuggestions([]);
                          }}
                        >
                          <MapPin className="w-3 h-3 inline mr-1.5 text-gray-400" />
                          {s.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                  {(!settings.address || settings.address.trim().length === 0) && (
                    <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      Почніть вводити — підберемо адресу автоматично
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

                {/* Lat/lng auto-filled from address geocoding */}
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
              <h2 className="text-base lg:text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                Години роботи
              </h2>

              {/* Quick presets — compact grid */}
              <div className="grid grid-cols-4 gap-2 mb-0">
                {[
                  { label: '9:00–18:00', sub: 'Пн–Сб', start: '09:00', end: '18:00' },
                  { label: '9:00–21:00', sub: 'Пн–Сб', start: '09:00', end: '21:00' },
                  { label: '10:00–20:00', sub: 'Пн–Сб', start: '10:00', end: '20:00' },
                  { label: '10:00–22:00', sub: 'Пн–Сб', start: '10:00', end: '22:00' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const days = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота', 'Неділя'];
                      const newHours = days.map((day, i) => ({
                        day,
                        enabled: i < 6,
                        start: i < 6 ? preset.start : '',
                        end: i < 6 ? preset.end : '',
                      }));
                      updateField('workingHours', newHours);
                    }}
                    className="flex flex-col items-center py-2 text-center rounded-lg border border-gray-200 bg-gray-50 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
                  >
                    <span className="text-[10px] text-gray-400 leading-tight">{preset.sub}</span>
                    <span className="text-xs font-medium leading-tight mt-0.5">{preset.label}</span>
                  </button>
                ))}
              </div>

              {/* Separator between presets and days */}
              <div className="border-t my-3" />

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

          {/* Theme Section — shown inside amenities */}
          {activeSection === 'amenities' && (
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

        {/* Right sidebar — checklist */}
        <div className="hidden xl:block w-[280px] shrink-0 border-l bg-white min-h-[calc(100vh-64px)] sticky top-16">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Прогрес</span>
              <span className="text-xs font-medium text-gray-500 tabular-nums">{completedCount}/{totalCount}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full rounded-full ${progressColor}`}
                style={{
                  width: `${progressPercent}%`,
                  transition: 'width 0.8s ease, background-color 0.6s ease',
                }}
              />
            </div>
            <div className="space-y-1.5">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                    item.completed ? 'text-gray-400' : 'text-gray-700'
                  }`}
                >
                  {item.completed ? (
                    <div className="animate-check-in">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    </div>
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                  )}
                  <span className={`flex-1 ${item.completed ? 'line-through' : ''}`}>
                    {item.label}
                  </span>
                  {item.detail && !item.completed && (
                    <span className="text-[11px] text-gray-400 font-medium">{item.detail}</span>
                  )}
                </div>
              ))}
            </div>
            {progressPercent === 100 && !settings.isPublished && (
              <div className="mt-4 p-3 rounded-xl bg-green-50 border border-green-200">
                <p className="text-xs font-medium text-green-800 mb-2">🎉 Все заповнено!</p>
                <Button
                  onClick={handlePublish}
                  disabled={publishing}
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl"
                >
                  {publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
                  Опублікувати
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar — publish / save */}
      {/* Mobile Save Bar — monolith with bottom nav (like WeekBar on calendar) */}
      <div
        className="lg:hidden fixed bottom-[63px] left-[23px] right-[23px] z-40 bg-white border border-black/10 border-b-0 rounded-t-2xl rounded-b-none"
      >
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Save draft */}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            variant="outline"
            className="flex-1 h-9 rounded-xl text-xs"
            size="sm"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1" />
            )}
            Зберегти
          </Button>

          {/* Publish / Update */}
          {!settings.isPublished ? (
            <Button
              onClick={handlePublish}
              disabled={!canPublish || publishing}
              className="flex-1 h-9 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs"
              size="sm"
            >
              {publishing ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Globe className="w-3.5 h-3.5 mr-1" />
              )}
              Опублікувати
            </Button>
          ) : (
            <>
              <Button
                onClick={handlePublish}
                disabled={publishing}
                className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs"
                size="sm"
              >
                {publishing ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                )}
                Оновити
              </Button>
              <a
                href={`https://${settings.slug}.tholim.com`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </a>
              <Button
                onClick={() => { setShowUnpublishModal(true); setUnpublishStep('confirm'); setUnpublishError(''); setUnpublishOtp(''); }}
                variant="outline"
                size="icon"
                className="h-9 w-9 text-red-500 border-red-200 rounded-xl shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Desktop Bottom Bar — right-aligned */}
      <div className="hidden lg:block fixed bottom-0 left-56 right-0 bg-white border-t z-30 h-[60px]">
        <div className="flex items-center justify-end gap-2 px-6 h-full">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            variant="outline"
            size="sm"
            className="rounded-xl"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Зберегти
          </Button>
          {!settings.isPublished ? (
            <Button
              onClick={handlePublish}
              disabled={!canPublish || publishing}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
              size="sm"
            >
              {publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
              Опублікувати
            </Button>
          ) : (
            <>
              <Button
                onClick={handlePublish}
                disabled={publishing}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                size="sm"
              >
                {publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Оновити
              </Button>
              <a href={`https://${settings.slug}.tholim.com`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                  <Eye className="w-4 h-4" />
                </Button>
              </a>
              <Button
                onClick={() => { setShowUnpublishModal(true); setUnpublishStep('confirm'); setUnpublishError(''); setUnpublishOtp(''); }}
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl text-red-500 border-red-200 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
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
