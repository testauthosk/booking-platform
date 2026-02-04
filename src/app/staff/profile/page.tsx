'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Loader2, Check, Camera, User, Image, X } from 'lucide-react';
import { COLOR_PALETTES, getPaletteById } from '@/lib/color-palettes';

export default function StaffProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [salonId, setSalonId] = useState('');
  const [colorPalette, setColorPalette] = useState<{ hex: string; name: string }[]>([]);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [role, setRole] = useState('');
  const [color, setColor] = useState('');
  const [lunchDuration, setLunchDuration] = useState(60); // Тривалість обіду в хв
  
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const formatPhoneDisplay = (value: string) => {
    // Remove +380 prefix and all non-digits
    const digits = value.replace(/^\+?380/, '').replace(/\D/g, '').slice(0, 9);
    let formatted = '';
    if (digits.length > 0) formatted += digits.slice(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
    if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digits = value.replace(/\D/g, '').slice(0, 9);
    setPhone('+380' + digits);
  };

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const id = localStorage.getItem('staffId');
    const salon = localStorage.getItem('staffSalonId');
    
    if (!token) {
      router.push('/staff/login');
      return;
    }
    
    setStaffId(id || '');
    setSalonId(salon || '');
    setLoading(false);
  }, [router]);

  // Load salon palette
  useEffect(() => {
    if (salonId) {
      loadSalonPalette();
    }
  }, [salonId]);

  const loadSalonPalette = async () => {
    try {
      const res = await fetch(`/api/salon/palette?salonId=${salonId}`);
      if (res.ok) {
        const data = await res.json();
        const palette = getPaletteById(data.paletteId);
        if (palette) {
          setColorPalette(palette.colors);
        } else {
          // Default to earth-harmony
          setColorPalette(COLOR_PALETTES[2].colors);
        }
      } else {
        setColorPalette(COLOR_PALETTES[2].colors);
      }
    } catch (error) {
      console.error('Load palette error:', error);
      setColorPalette(COLOR_PALETTES[2].colors);
    }
  };

  useEffect(() => {
    if (staffId) {
      loadProfile();
    }
  }, [staffId]);

  const loadProfile = async () => {
    try {
      const res = await fetch(`/api/staff/profile?masterId=${staffId}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.name || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setBio(data.bio || '');
        setAvatar(data.avatar || '');
        setRole(data.role || '');
        setColor(data.color || colorPalette[0]?.hex || '#f97316');
        setLunchDuration(data.lunchDuration ?? 60);
      }
    } catch (error) {
      console.error('Load profile error:', error);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/staff/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterId: staffId,
          name,
          phone,
          bio,
          color,
          lunchDuration
        })
      });
      
      if (res.ok) {
        // Update localStorage
        localStorage.setItem('staffName', name);
        router.push('/staff');
      }
    } catch (error) {
      console.error('Save profile error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    setPhotoPickerOpen(false);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'masters');
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        setAvatar(data.url);
        
        // Save to profile
        await fetch('/api/staff/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            masterId: staffId,
            avatar: data.url
          })
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/staff')}
            className="h-9 w-10 rounded-xl border border-border hover:bg-muted flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="font-semibold text-lg">Мій профіль</h1>
            <p className="text-sm text-muted-foreground">Редагуйте дані</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {uploadingPhoto ? (
              <div className="h-24 w-24 rounded-2xl bg-muted flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : avatar ? (
              <img 
                src={avatar} 
                alt={name} 
                className="h-24 w-24 rounded-2xl object-cover"
              />
            ) : (
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-bold">
                {name.charAt(0).toUpperCase() || <User className="h-10 w-10" />}
              </div>
            )}
            <button 
              onClick={() => setPhotoPickerOpen(true)}
              className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
            >
              <Camera className="h-5 w-5" />
            </button>
          </div>
          {role && (
            <span className="mt-3 text-sm text-muted-foreground">{role}</span>
          )}
          
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>

        {/* Color picker */}
        <Card className="p-4">
          <h3 className="font-medium mb-0.5">Колір у календарі</h3>
          <p className="text-xs text-muted-foreground mb-1">
            Цей колір відображатиметься у календарі бронювань
          </p>
          <div className="flex flex-wrap gap-2">
            {colorPalette.length > 0 ? colorPalette.map((c) => (
              <button
                key={c.hex}
                onClick={() => setColor(c.hex)}
                className={`w-10 h-10 rounded-xl transition-all ${
                  color === c.hex 
                    ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              >
                {color === c.hex && (
                  <Check className="h-5 w-5 text-white mx-auto drop-shadow" />
                )}
              </button>
            )) : (
              <p className="text-sm text-muted-foreground">Завантаження...</p>
            )}
          </div>
        </Card>

        {/* Lunch duration */}
        <Card className="p-4">
          <h3 className="font-medium mb-0.5">🍽️ Тривалість обіду</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Для швидкого блокування часу на обід
          </p>
          <div className="flex flex-wrap gap-2">
            {[15, 30, 45, 60, 90].map((mins) => (
              <button
                key={mins}
                onClick={() => setLunchDuration(mins)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  lunchDuration === mins 
                    ? 'ring-2 ring-offset-2 ring-primary' 
                    : 'hover:scale-105'
                }`}
                style={{ 
                  backgroundColor: lunchDuration === mins ? color : `${color}20`,
                  color: lunchDuration === mins ? 'white' : color,
                  borderWidth: 1,
                  borderColor: `${color}50`
                }}
              >
                {mins} хв
              </button>
            ))}
          </div>
        </Card>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Імʼя *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше імʼя"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Телефон</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-base font-medium text-muted-foreground">+380</span>
              <Input
                type="tel"
                value={formatPhoneDisplay(phone)}
                onChange={handlePhoneChange}
                placeholder="XX XXX XX XX"
                className="pl-16 text-base"
                maxLength={12}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <Input
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">Email не можна змінити</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Про себе</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Розкажіть клієнтам про себе..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-input bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Stats card */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">Статистика</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-xs text-muted-foreground">Записів цього місяця</p>
            </div>
            <div>
              <p className="text-2xl font-bold">5.0</p>
              <p className="text-xs text-muted-foreground">Середній рейтинг</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Photo picker modal */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-all duration-700 ease-in-out ${
          photoPickerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setPhotoPickerOpen(false)}
      />
      <div 
        className={`fixed inset-x-0 bottom-0 bg-card rounded-t-3xl shadow-xl z-50 transform transition-all duration-700 ease-in-out ${
          photoPickerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Завантажити фото</h2>
          <button 
            onClick={() => setPhotoPickerOpen(false)}
            className="h-9 w-10 rounded-xl border border-border hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 space-y-2">
          <button
            onClick={() => {
              cameraInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors"
          >
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Camera className="h-5 w-5 text-blue-600" />
            </div>
            <span className="font-medium">Зробити фото</span>
          </button>
          <button
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Image className="h-5 w-5 text-purple-600" />
            </div>
            <span className="font-medium">Обрати з галереї</span>
          </button>
          
          {avatar && (
            <>
              <div className="border-t border-border my-2" />
              <button
                onClick={() => {
                  setPhotoPickerOpen(false);
                  setDeleteConfirmOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors text-red-600"
              >
                <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <X className="h-5 w-5 text-red-600" />
                </div>
                <span className="font-medium">Видалити фото</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-all duration-700 ease-in-out ${
          deleteConfirmOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setDeleteConfirmOpen(false)}
      />
      <div 
        className={`fixed inset-x-0 bottom-0 bg-card rounded-t-3xl shadow-xl z-[70] transform transition-all duration-700 ease-in-out ${
          deleteConfirmOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-4 text-center">
          <p className="font-semibold mb-1">Видалити фото?</p>
          <p className="text-sm text-muted-foreground mb-4">Ви впевнені, що хочете видалити фото профілю?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="flex-1 py-3 rounded-xl border border-border font-medium hover:bg-muted transition-colors"
            >
              Скасувати
            </button>
            <button
              onClick={async () => {
                setAvatar('');
                await fetch('/api/staff/profile', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ masterId: staffId, avatar: '' })
                });
                setDeleteConfirmOpen(false);
              }}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
            >
              Видалити
            </button>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="shrink-0 p-4 bg-card border-t">
        <button
          onClick={saveProfile}
          disabled={saving || !name}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Check className="h-5 w-5" />
              Зберегти
            </>
          )}
        </button>
      </div>
    </div>
  );
}
