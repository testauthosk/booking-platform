'use client';

import { useState, useEffect } from 'react';
import { X, Phone, Mail, MessageCircle, Calendar, Edit2, Check, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ClientData {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  telegramUsername?: string;
  telegramChatId?: string;
  visitsWithMaster?: number;
  spentWithMaster?: number;
  visitsCount?: number;
  totalSpent?: number;
  lastVisitWithMaster?: string;
  createdAt?: string;
}

interface ClientCardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  clientPhone: string;
  clientName: string;
  masterId: string;
  salonId: string;
  accentColor?: string;
  editable?: boolean;
}

const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500', 
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-violet-500',
];

function getAvatarColor(name: string) {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('380')) {
    return `+380 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return phone;
}

export function ClientCardPanel({
  isOpen,
  onClose,
  clientPhone,
  clientName,
  masterId,
  salonId,
  accentColor = '#6366f1',
  editable = true,
}: ClientCardPanelProps) {
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<ClientData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    telegramUsername: '',
  });

  // Анімація відкриття/закриття
  useEffect(() => {
    if (isOpen) {
      // Встановлюємо базові дані одразу
      setClient({
        name: clientName,
        phone: clientPhone,
        visitsWithMaster: 0,
        spentWithMaster: 0,
        visitsCount: 0,
      });
      setEditForm({
        name: clientName,
        phone: clientPhone,
        email: '',
        notes: '',
        telegramUsername: '',
      });
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      // Завантажуємо повні дані у фоні
      if (clientPhone) {
        loadClient();
      }
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setClient(null);
        setIsEditing(false);
      }, 560);
      return () => clearTimeout(timer);
    }
  }, [isOpen, clientPhone, clientName]);

  const loadClient = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/clients/by-phone?phone=${encodeURIComponent(clientPhone)}&masterId=${masterId}`);
      if (res.ok) {
        const data = await res.json();
        setClient(data);
        setEditForm({
          name: data.name || clientName,
          phone: data.phone || clientPhone,
          email: data.email || '',
          notes: data.notes || '',
          telegramUsername: data.telegramUsername || '',
        });
      }
      // Якщо не знайшли — залишаємо базові дані що вже встановлені
    } catch (error) {
      console.error('Error loading client:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!client?.id) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/staff/clients?masterId=${masterId}&clientId=${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setClient(prev => prev ? { ...prev, ...updated } : null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving client:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getClientTags = () => {
    const tags: { label: string; color: string }[] = [];
    if (!client) return tags;
    
    // Check if new client (created within last 7 days)
    if (client.createdAt) {
      const created = new Date(client.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (created > weekAgo) {
        tags.push({ label: 'Новий', color: 'bg-emerald-100 text-emerald-700' });
      }
    }
    
    // VIP - more than 10 visits
    if ((client.visitsWithMaster || 0) >= 10) {
      tags.push({ label: 'VIP', color: 'bg-amber-100 text-amber-700' });
    }
    
    // Has Telegram
    if (client.telegramChatId) {
      tags.push({ label: 'Telegram', color: 'bg-sky-100 text-sky-700' });
    }
    
    return tags;
  };

  if (!isVisible) return null;

  const tags = getClientTags();

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[120]"
        style={{
          opacity: isAnimating ? 1 : 0,
          transition: 'opacity 560ms ease-out',
        }}
        onClick={onClose}
      />

      {/* Panel - slides from right */}
      <div 
        className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-background shadow-2xl z-[130] flex flex-col overflow-hidden"
        style={{
          transform: isAnimating ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 560ms ease-out',
        }}
      >
        {client && (
          <>
            {/* Header with gradient */}
            <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6 pb-4">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-white/80 hover:bg-white shadow-md border border-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-gray-700" />
              </button>

              <div className="flex items-start gap-4">
                <div className={cn(
                  "h-16 w-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg",
                  getAvatarColor(client.name)
                )}>
                  {getInitials(client.name)}
                </div>
                
                <div className="flex-1">
                  {isEditing ? (
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="text-xl font-bold h-auto py-1 px-2"
                    />
                  ) : (
                    <h2 className="text-xl font-bold">{client.name}</h2>
                  )}
                  
                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.map((tag, idx) => (
                        <span 
                          key={idx}
                          className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", tag.color)}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 mt-4">
                <Button 
                  size="sm" 
                  className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => window.open(`tel:${client.phone}`)}
                >
                  <Phone className="h-4 w-4" />
                  Зателефонувати
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1 gap-2 bg-sky-500 hover:bg-sky-600 text-white"
                  onClick={() => {
                    if (client.telegramUsername) {
                      window.open(`https://t.me/${client.telegramUsername}`);
                    } else if (client.telegramChatId) {
                      window.open(`tg://user?id=${client.telegramChatId}`);
                    } else {
                      alert('У клієнта немає Telegram');
                    }
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Telegram
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 px-4 py-3 border-b">
              <div className="text-center">
                <p className="text-2xl font-bold">{client.visitsWithMaster || 0}</p>
                <p className="text-xs text-muted-foreground">у вас</p>
              </div>
              <div className="text-center border-x">
                <p className="text-2xl font-bold">{(client.spentWithMaster || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">₴ у вас</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{client.visitsCount || 0}</p>
                <p className="text-xs text-muted-foreground">всього</p>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {/* Contact info */}
              <Card className={cn(
                "p-4 space-y-3 transition-all duration-300",
                isEditing ? "ring-2 ring-primary/20 shadow-md" : ""
              )}>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-muted-foreground">Контакти</h3>
                  {editable && client.id && (
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={cn(
                        "text-xs flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200",
                        isEditing 
                          ? "bg-red-50 text-red-600 hover:bg-red-100" 
                          : "text-primary hover:bg-primary/10"
                      )}
                    >
                      <Edit2 className="h-3 w-3" />
                      {isEditing ? 'Скасувати' : 'Редагувати'}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 transition-all duration-200">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 relative">
                      <Input
                        value={isEditing ? editForm.phone : formatPhone(client.phone)}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        className={cn(
                          "h-8 text-sm transition-all duration-200",
                          isEditing ? "opacity-100 bg-white" : "opacity-100 bg-transparent border-transparent pointer-events-none"
                        )}
                        readOnly={!isEditing}
                      />
                    </div>
                  </div>
                  <div className={cn(
                    "flex items-center gap-3 transition-all duration-200 overflow-hidden",
                    !client.email && !isEditing ? "h-0 opacity-0" : "h-auto opacity-100"
                  )}>
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <Input
                        value={editForm.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@example.com"
                        className={cn(
                          "h-8 text-sm transition-all duration-200",
                          isEditing ? "opacity-100 bg-white" : "opacity-100 bg-transparent border-transparent pointer-events-none"
                        )}
                        readOnly={!isEditing}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 transition-all duration-200">
                    <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <Input
                        value={isEditing ? editForm.telegramUsername : (client.telegramUsername ? `@${client.telegramUsername}` : '')}
                        onChange={(e) => setEditForm(prev => ({ ...prev, telegramUsername: e.target.value.replace('@', '') }))}
                        placeholder={isEditing ? "username (без @)" : "Не вказано"}
                        className={cn(
                          "h-8 text-sm transition-all duration-200",
                          isEditing ? "opacity-100 bg-white" : "opacity-100 bg-transparent border-transparent pointer-events-none",
                          !client.telegramUsername && !isEditing ? "text-muted-foreground" : ""
                        )}
                        readOnly={!isEditing}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Notes */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm text-muted-foreground">Нотатки</h3>
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    🔒 Бачать тільки працівники
                  </span>
                </div>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  onBlur={async () => {
                    if (client?.id && editForm.notes !== client.notes) {
                      try {
                        await fetch(`/api/staff/clients?masterId=${masterId}&clientId=${client.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ notes: editForm.notes }),
                        });
                        setClient(prev => prev ? { ...prev, notes: editForm.notes } : null);
                      } catch (error) {
                        console.error('Error saving notes:', error);
                      }
                    }
                  }}
                  placeholder="Додайте нотатки про клієнта..."
                  className="w-full h-24 text-sm border rounded-lg p-2 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </Card>

              {/* Last visit */}
              {client.lastVisitWithMaster && (
                <Card className="p-4">
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Останній візит</h3>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(client.lastVisitWithMaster).toLocaleDateString('uk-UA', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </Card>
              )}
            </div>

            {/* Footer - Save button when editing */}
            {isEditing && (
              <div className="p-4 border-t">
                <Button 
                  className="w-full gap-2"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Зберегти
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
