'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// TODO: Получать из контекста авторизации
const DEFAULT_SALON_ID = '93b6801f-0193-4706-896b-3de71f3799e1';

interface Salon {
  id: string;
  name: string;
  slug: string;
  type: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  shortAddress?: string;
  latitude?: number;
  longitude?: number;
  logo?: string;
  photos: string[];
  workingHours?: any;
  amenities: string[];
}

export default function BusinessSettingsPage() {
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [shortAddress, setShortAddress] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [bufferTime, setBufferTime] = useState(0);

  useEffect(() => {
    loadSalon();
  }, []);

  const loadSalon = async () => {
    try {
      const res = await fetch(`/api/salon?salonId=${salonId}`);
      if (res.ok) {
        const data = await res.json();
        setSalon(data);
        setName(data.name || '');
        setSlug(data.slug || '');
        setType(data.type || '');
        setDescription(data.description || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setAddress(data.address || '');
        setShortAddress(data.shortAddress || '');
        setPhotos(data.photos || []);
        setBufferTime(data.bufferTime || 0);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/salon', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: salonId,
          name,
          slug,
          type,
          description,
          phone,
          email,
          address,
          shortAddress,
          photos,
          bufferTime,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSalon(data);
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', `salons/${salonId}`);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          return data.url;
        }
        return null;
      });

      const urls = await Promise.all(uploadPromises);
      const validUrls = urls.filter((url): url is string => url !== null);
      setPhotos((prev) => [...prev, ...validUrls]);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const copyPublicUrl = () => {
    const url = `${window.location.origin}/salon/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/salon/${slug}`;

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/setup">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Профіль закладу</h1>
          <p className="text-muted-foreground">
            Налаштуйте інформацію про ваш заклад
          </p>
        </div>
      </div>

      {/* Public URL */}
      {slug && (
        <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary mb-1">
                Публічна сторінка
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {publicUrl}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyPublicUrl}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Form */}
      <div className="space-y-6">
        {/* Basic Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Основна інформація</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Назва закладу *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Барбершоп Бородач"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL (slug) *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="borodach"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Тип закладу</Label>
              <Input
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="Барбершоп"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Опис</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Розкажіть про ваш заклад..."
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Contact Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Контакти</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+380 XX XXX XX XX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Повна адреса</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="м. Київ, вул. Хрещатик, 1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortAddress">Коротка адреса (для карток)</Label>
              <Input
                id="shortAddress"
                value={shortAddress}
                onChange={(e) => setShortAddress(e.target.value)}
                placeholder="Хрещатик, 1"
              />
            </div>
          </div>
        </Card>

        {/* Booking Settings */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Налаштування бронювання</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bufferTime">Авто-буфер між записами (хвилини)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Автоматичний перерва між записами для підготовки
              </p>
              <div className="flex items-center gap-3">
                {[0, 5, 10, 15, 30].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setBufferTime(mins)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      bufferTime === mins
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {mins === 0 ? 'Без буфера' : `${mins} хв`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Photos */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Фотографії</h2>
          
          <div className="space-y-4">
            {/* Photo grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted group"
                >
                  <Image
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {index === 0 && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/50 text-white text-xs">
                      Головне
                    </div>
                  )}
                </div>
              ))}

              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-[4/3] rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Додати</span>
                  </>
                )}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <p className="text-sm text-muted-foreground">
              Перше фото буде головним. Рекомендований розмір: 1200x800px
            </p>
          </div>
        </Card>

        {/* Save button */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link href="/setup">Скасувати</Link>
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Зберегти
          </Button>
        </div>
      </div>
    </div>
  );
}
