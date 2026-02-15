'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Camera, Loader2, Save, Info, Trash2 } from 'lucide-react';

// ── Types ──

interface ServiceCategory {
  id: string;
  name: string;
  sortOrder: number;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  categoryId: string | null;
  category: { id: string; name: string } | null;
}

interface MasterServiceItem {
  serviceId: string;
  customPrice?: number | null;
}

interface WorkingDay {
  enabled: boolean;
  start: string;
  end: string;
}

type WorkingHours = Record<string, WorkingDay>;

interface MasterData {
  id?: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  avatar: string;
  bio: string;
  workingHours: WorkingHours;
  lunchStart: string;
  lunchDuration: number;
  services: MasterServiceItem[];
  hasPassword?: boolean;
}

interface MasterFormProps {
  masterId?: string; // undefined = create mode
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Понеділок',
  tue: 'Вівторок',
  wed: 'Середа',
  thu: 'Четвер',
  fri: "П'ятниця",
  sat: 'Субота',
  sun: 'Неділя',
};

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const DEFAULT_WORKING_HOURS: WorkingHours = {
  mon: { enabled: true, start: '09:00', end: '18:00' },
  tue: { enabled: true, start: '09:00', end: '18:00' },
  wed: { enabled: true, start: '09:00', end: '18:00' },
  thu: { enabled: true, start: '09:00', end: '18:00' },
  fri: { enabled: true, start: '09:00', end: '18:00' },
  sat: { enabled: false, start: '10:00', end: '16:00' },
  sun: { enabled: false, start: '10:00', end: '16:00' },
};

export function MasterForm({ masterId }: MasterFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const salonId = session?.user?.salonId || '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!masterId;

  // Form state
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS);
  const [lunchStart, setLunchStart] = useState('13:00');
  const [lunchDuration, setLunchDuration] = useState(60);
  const [selectedServices, setSelectedServices] = useState<Record<string, { checked: boolean; customPrice: string }>>({});
  const [hasPassword, setHasPassword] = useState(false);

  // Data
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load services + categories + master data
  useEffect(() => {
    if (!salonId) return;
    loadFormData();
  }, [salonId, masterId]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        fetch(`/api/services?salonId=${salonId}`),
        fetch(`/api/categories?salonId=${salonId}`),
      ]);

      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setAllServices(data);
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data);
      }

      // Load master data if editing
      if (masterId) {
        const masterRes = await fetch(`/api/masters/${masterId}`);
        if (masterRes.ok) {
          const master = await masterRes.json();
          setName(master.name || '');
          setRole(master.role || '');
          setPhone(master.phone || '');
          setEmail(master.email || '');
          setAvatar(master.avatar || '');
          setBio(master.bio || '');
          setLunchStart(master.lunchStart || '13:00');
          setLunchDuration(master.lunchDuration ?? 60);
          setHasPassword(master.hasPassword || false);

          if (master.workingHours && typeof master.workingHours === 'object') {
            setWorkingHours({ ...DEFAULT_WORKING_HOURS, ...master.workingHours });
          }

          // Set selected services
          if (master.services && Array.isArray(master.services)) {
            const svcMap: Record<string, { checked: boolean; customPrice: string }> = {};
            master.services.forEach((ms: any) => {
              svcMap[ms.serviceId] = {
                checked: true,
                customPrice: ms.customPrice ? String(ms.customPrice) : '',
              };
            });
            setSelectedServices(svcMap);
          }
        }
      }
    } catch (err) {
      console.error('Load form data error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'booking-platform/avatars');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAvatar(data.url);
      } else {
        setError('Помилка завантаження фото');
      }
    } catch (err) {
      setError('Помилка завантаження фото');
    } finally {
      setUploading(false);
    }
  };

  // Toggle service
  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => {
      const current = prev[serviceId];
      if (current?.checked) {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      }
      return { ...prev, [serviceId]: { checked: true, customPrice: '' } };
    });
  };

  // Update custom price
  const updateCustomPrice = (serviceId: string, price: string) => {
    setSelectedServices(prev => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], customPrice: price },
    }));
  };

  // Update working hours
  const updateDay = (day: string, field: keyof WorkingDay, value: any) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  // Save
  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    if (!name.trim()) {
      setError("Ім'я обов'язкове");
      return;
    }

    setSaving(true);

    // Build services array
    const services: MasterServiceItem[] = Object.entries(selectedServices)
      .filter(([, v]) => v.checked)
      .map(([serviceId, v]) => ({
        serviceId,
        customPrice: v.customPrice ? parseInt(v.customPrice, 10) : undefined,
      }));

    const payload = {
      name: name.trim(),
      role: role.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      avatar: avatar || undefined,
      bio: bio.trim() || undefined,
      workingHours,
      lunchStart,
      lunchDuration,
      services,
    };

    try {
      const url = isEdit ? `/api/masters/${masterId}` : '/api/masters';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Помилка збереження');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/team');
      }, 800);
    } catch (err) {
      setError('Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  // Group services by category
  const servicesByCategory = () => {
    const grouped: Record<string, { category: ServiceCategory | null; services: Service[] }> = {};

    // Add "no category" group
    const uncategorized = allServices.filter(s => !s.categoryId);
    if (uncategorized.length > 0) {
      grouped['__none__'] = { category: null, services: uncategorized };
    }

    // Add category groups
    categories.forEach(cat => {
      const catServices = allServices.filter(s => s.categoryId === cat.id);
      if (catServices.length > 0) {
        grouped[cat.id] = { category: cat, services: catServices };
      }
    });

    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <button
            onClick={() => router.push('/team')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Команда</span>
          </button>
          <h1 className="text-base font-semibold">
            {isEdit ? 'Редагувати майстра' : 'Новий майстер'}
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 pb-32 space-y-6">
        {/* Managed badge for edit mode */}
        {isEdit && !hasPassword && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
            <Info className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700">
              Керований майстер — без особистого кабінету
            </p>
          </div>
        )}

        {/* ── Avatar ── */}
        <Card className="p-6 rounded-xl">
          <Label className="text-sm font-medium text-muted-foreground mb-3 block">Фото</Label>
          <div className="flex items-center gap-4">
            <div
              className="relative h-20 w-20 rounded-2xl bg-muted flex items-center justify-center overflow-hidden cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatar ? (
                <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-6 w-6 text-muted-foreground" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                {!uploading && avatar && <Camera className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
            </div>
            <div className="flex-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Завантаження...' : avatar ? 'Змінити фото' : 'Завантажити фото'}
              </Button>
              {avatar && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl ml-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setAvatar('')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP. Макс 5MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
        </Card>

        {/* ── Основна інформація ── */}
        <Card className="p-6 rounded-xl space-y-4">
          <Label className="text-sm font-medium text-muted-foreground block">Основна інформація</Label>

          <div className="space-y-2">
            <Label htmlFor="name">Ім&apos;я *</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ім'я майстра"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Посада</Label>
            <Input
              id="role"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="Барбер, Стиліст, Колорист..."
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+380..."
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Про майстра</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Коротко про досвід, спеціалізацію..."
              className="rounded-xl min-h-[80px]"
            />
          </div>
        </Card>

        {/* ── Email ── */}
        <Card className="p-6 rounded-xl space-y-3">
          <Label className="text-sm font-medium text-muted-foreground block">Email</Label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="master@email.com"
            className="rounded-xl"
          />
          <div className="flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Без email = без особистого кабінету. Майстер не зможе самостійно авторизуватись, але ви зможете керувати його графіком та записами.
            </p>
          </div>
        </Card>

        {/* ── Послуги ── */}
        <Card className="p-6 rounded-xl space-y-4">
          <Label className="text-sm font-medium text-muted-foreground block">Послуги</Label>

          {allServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Послуги ще не додані. Додайте їх у розділі &quot;Послуги&quot;.
            </p>
          ) : (
            <div className="space-y-5">
              {Object.entries(servicesByCategory()).map(([groupKey, group]) => (
                <div key={groupKey}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {group.category?.name || 'Без категорії'}
                  </p>
                  <div className="space-y-2">
                    {group.services.map(service => {
                      const isChecked = !!selectedServices[service.id]?.checked;
                      return (
                        <div key={service.id} className="space-y-2">
                          <div
                            className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${
                              isChecked ? 'border-primary/30 bg-primary/5' : 'border-border hover:bg-muted/50'
                            }`}
                            onClick={() => toggleService(service.id)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div
                                className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                                  isChecked
                                    ? 'bg-primary border-primary'
                                    : 'border-gray-300'
                                }`}
                              >
                                {isChecked && (
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{service.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {service.price} ₴ · {service.duration} хв
                                </p>
                              </div>
                            </div>
                          </div>
                          {isChecked && (
                            <div className="ml-8 flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground whitespace-nowrap">Своя ціна:</Label>
                              <Input
                                type="number"
                                value={selectedServices[service.id]?.customPrice || ''}
                                onChange={e => updateCustomPrice(service.id, e.target.value)}
                                placeholder={String(service.price)}
                                className="rounded-xl h-8 w-28 text-sm"
                                onClick={e => e.stopPropagation()}
                              />
                              <span className="text-xs text-muted-foreground">₴</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Графік роботи ── */}
        <Card className="p-6 rounded-xl space-y-4">
          <Label className="text-sm font-medium text-muted-foreground block">Графік роботи</Label>

          <div className="space-y-3">
            {DAY_KEYS.map(day => {
              const dayData = workingHours[day];
              return (
                <div key={day} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={dayData.enabled}
                        onCheckedChange={(checked) => updateDay(day, 'enabled', checked)}
                      />
                      <span className={`text-sm ${dayData.enabled ? 'font-medium' : 'text-muted-foreground'}`}>
                        {DAY_LABELS[day]}
                      </span>
                    </div>
                  </div>
                  {dayData.enabled && (
                    <div className="flex items-center gap-2 ml-14">
                      <Input
                        type="time"
                        value={dayData.start}
                        onChange={e => updateDay(day, 'start', e.target.value)}
                        className="rounded-xl h-9 w-28 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">—</span>
                      <Input
                        type="time"
                        value={dayData.end}
                        onChange={e => updateDay(day, 'end', e.target.value)}
                        className="rounded-xl h-9 w-28 text-sm"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Обід ── */}
        <Card className="p-6 rounded-xl space-y-4">
          <Label className="text-sm font-medium text-muted-foreground block">Обідня перерва</Label>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lunchStart" className="text-xs">Початок обіду</Label>
              <Input
                id="lunchStart"
                type="time"
                value={lunchStart}
                onChange={e => setLunchStart(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lunchDuration" className="text-xs">Тривалість (хв)</Label>
              <Input
                id="lunchDuration"
                type="number"
                min={0}
                max={180}
                value={lunchDuration}
                onChange={e => setLunchDuration(parseInt(e.target.value) || 0)}
                className="rounded-xl"
              />
            </div>
          </div>
        </Card>

        {/* ── Error / Success ── */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200">
            <p className="text-sm text-green-700">
              {isEdit ? 'Майстра оновлено!' : 'Майстра створено!'}
            </p>
          </div>
        )}

        {/* ── Save button ── */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="w-full h-12 rounded-xl text-base font-medium"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Збереження...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  {isEdit ? 'Зберегти зміни' : 'Створити майстра'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
