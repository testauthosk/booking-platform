'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Loader2, Check, Camera, User } from 'lucide-react';

// Палітра кольорів (earth-harmony)
const COLOR_PALETTE = [
  { hex: '#87C2CA', name: 'Тибетський камінь' },
  { hex: '#BAB8A8', name: 'Зелене дерево' },
  { hex: '#E6D17B', name: 'Пшеничне золото' },
  { hex: '#DF93B4', name: 'Квітка персика' },
  { hex: '#94B5FD', name: 'Каролінський синій' },
  { hex: '#C0B283', name: 'Піщаний беж' },
  { hex: '#9DF0B3', name: "М'ятний тонік" },
  { hex: '#BDB7DB', name: 'Мелроуз' },
  { hex: '#D3E08C', name: 'Зелене зачарування' },
  { hex: '#F1C764', name: 'Медовий' },
];

export default function StaffProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffId, setStaffId] = useState('');
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [role, setRole] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const id = localStorage.getItem('staffId');
    
    if (!token) {
      router.push('/staff/login');
      return;
    }
    
    setStaffId(id || '');
    setLoading(false);
  }, [router]);

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
        setColor(data.color || COLOR_PALETTE[0].hex);
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
          color
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/staff')}
            className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-semibold text-lg">Мій профіль</h1>
            <p className="text-sm text-muted-foreground">Редагуйте дані</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-32 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {avatar ? (
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
            <button className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
              <Camera className="h-5 w-5" />
            </button>
          </div>
          {role && (
            <span className="mt-3 text-sm text-muted-foreground">{role}</span>
          )}
        </div>

        {/* Color picker */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">Колір у календарі</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Цей колір відображатиметься у календарі бронювань
          </p>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((c) => (
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
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+380..."
            />
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

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t">
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
