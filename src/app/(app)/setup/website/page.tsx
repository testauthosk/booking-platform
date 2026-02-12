'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Checklist logic
  const checklist = useMemo<ChecklistItem[]>(() => {
    if (!settings) return [];

    const hasWorkingHours = Array.isArray(settings.workingHours) &&
      settings.workingHours.some((d) => d.enabled);

    return [
      {
        id: 'name',
        label: 'Назва закладу',
        completed: !!settings.name && settings.name.trim().length > 0,
        hint: 'Вкажіть назву вашого закладу',
      },
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
      {
        id: 'services',
        label: 'Хоча б 1 послуга',
        completed: settings.servicesCount > 0,
        hint: 'Додайте послуги, щоб клієнти могли записатися',
        detail: settings.servicesCount > 0 ? `${settings.servicesCount}` : '0',
      },
      {
        id: 'masters',
        label: 'Хоча б 1 майстер',
        completed: settings.mastersCount > 0,
        hint: 'Додайте майстрів для бронювання',
        detail: settings.mastersCount > 0 ? `${settings.mastersCount}` : '0',
      },
    ];
  }, [settings]);

  const completedCount = checklist.filter((c) => c.completed).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Minimum requirements for publishing: name + 1 service + 1 master
  const canPublish = useMemo(() => {
    if (!settings) return false;
    return (
      !!settings.name &&
      settings.name.trim().length > 0 &&
      settings.servicesCount > 0 &&
      settings.mastersCount > 0
    );
  }, [settings]);

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

  const progressColor = progressPercent === 100
    ? 'bg-green-500'
    : progressPercent >= 60
      ? 'bg-blue-500'
      : 'bg-amber-500';

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-3">
            <Link href="/setup">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-lg">Редактор сайту</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Налаштуйте публічну сторінку вашого салону
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

      {/* Progress Bar — sticky under header */}
      <div className="sticky top-16 z-10 bg-white border-b shadow-sm">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowChecklist(!showChecklist)}
              className="text-sm font-medium text-gray-700 flex items-center gap-1.5 hover:text-gray-900 transition-colors"
            >
              {progressPercent === 100 ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400" />
              )}
              Ваш сайт готовий на {progressPercent}%
            </button>
            <span className="text-xs text-muted-foreground">
              {completedCount}/{totalCount}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full animate-progress ${progressColor}`}
              style={{
                width: `${progressPercent}%`,
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>

          {/* Checklist */}
          {showChecklist && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {checklist.map((item, index) => (
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
                    <Circle className="w-4 h-4 text-gray-300 shrink-0" />
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
          )}
        </div>
      </div>

      <div className="flex">
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
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl pb-40 lg:pb-8">
          {/* Mobile Section Tabs */}
          <div className="lg:hidden mb-6 overflow-x-auto -mx-4 px-4 scrollbar-hide">
            <div className="flex gap-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeSection === section.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 border'
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section Hint */}
          {sectionHints[activeSection]?.show && (
            <div className="mb-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{sectionHints[activeSection].text}</span>
            </div>
          )}

          {/* Basic Info Section */}
          {activeSection === 'basic' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-400" />
                Основна інформація
              </h2>
              <div className="space-y-6">
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
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground flex-shrink-0">.tholim.com</span>
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
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Phone className="w-5 h-5 text-gray-400" />
                Контактна інформація
              </h2>
              <div className="space-y-6">
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

                <div className="grid grid-cols-2 gap-4">
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
                <p className="text-xs text-muted-foreground -mt-4">
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
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-gray-400" />
                Медіа
              </h2>
              <div className="space-y-8">
                {/* Logo */}
                <div>
                  <Label>Логотип</Label>
                  <div className="mt-3 flex items-start gap-4">
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
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
                    <div className="flex-1">
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
                  <div className="flex items-center justify-between">
                    <Label>Галерея фото</Label>
                    {settings.photos.length < 3 && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {settings.photos.length}/3 мінімум
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Перше фото буде головним на сторінці
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                Години роботи
              </h2>
              <div className="space-y-3">
                {settings.workingHours?.map((day, index) => (
                  <div
                    key={day.day}
                    className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                      day.enabled ? 'bg-white border' : 'bg-gray-50'
                    }`}
                  >
                    <Switch
                      checked={day.enabled}
                      onCheckedChange={(checked) => updateWorkingHours(index, 'enabled', checked)}
                    />
                    <span
                      className={`w-28 text-sm font-medium ${
                        day.enabled ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {day.day}
                    </span>
                    {day.enabled ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={day.start}
                          onChange={(e) => updateWorkingHours(index, 'start', e.target.value)}
                          className="w-28"
                        />
                        <span className="text-gray-400">—</span>
                        <Input
                          type="time"
                          value={day.end}
                          onChange={(e) => updateWorkingHours(index, 'end', e.target.value)}
                          className="w-28"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Зачинено</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Amenities Section */}
          {activeSection === 'amenities' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gray-400" />
                Зручності
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_AMENITIES.map((amenity) => {
                  const isSelected = settings.amenities?.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-white' : 'border-2 border-gray-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-gray-900" />}
                      </div>
                      <span className="text-sm font-medium">{amenity}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Theme Section */}
          {activeSection === 'theme' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Palette className="w-5 h-5 text-gray-400" />
                Кольорова тема
              </h2>
              <div className="flex flex-col gap-3">
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
                      <div className="flex gap-1 flex-shrink-0">
                        {palette.colors.map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color.hex }}
                          />
                        ))}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{palette.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{palette.description}</p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-gray-900 flex-shrink-0 ml-auto" />
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
