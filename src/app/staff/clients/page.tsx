'use client';

import { useState, useEffect } from 'react';
import { useTransitionRouter } from 'next-view-transitions';
import { 
  ArrowLeft, Search, Phone, User, Loader2, ChevronRight, 
  X, Mail, MessageCircle, Calendar, Heart, Star, Award,
  Edit2, Check, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  telegramUsername?: string;
  telegramChatId?: string;
  visitsCount: number;
  totalSpent: number;
  notes?: string;
  createdAt: string;
  visitsWithMaster: number;
  spentWithMaster: number;
  lastVisitWithMaster?: string;
}

export default function StaffClientsPage() {
  const router = useTransitionRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [masterId, setMasterId] = useState('');
  const [salonId, setSalonId] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isPanelAnimating, setIsPanelAnimating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', notes: '', telegramUsername: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  // Add client modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addModalAnimating, setAddModalAnimating] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientLastName, setNewClientLastName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [addingClient, setAddingClient] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const id = localStorage.getItem('staffId');
    const salon = localStorage.getItem('staffSalonId');
    
    if (!token) {
      router.push('/staff/login');
      return;
    }
    
    setMasterId(id || '');
    setSalonId(salon || '');
  }, [router]);

  useEffect(() => {
    if (masterId) {
      loadClients();
    }
  }, [masterId]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/clients?masterId=${masterId}&search=${search}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (masterId) loadClients();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-violet-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500',
      'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500'
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  };

  // Capitalize each word
  const capitalizeWords = (str: string) => {
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Add client modal functions
  const openAddModal = () => {
    setNewClientName('');
    setNewClientLastName('');
    setNewClientPhone('');
    setAddModalVisible(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAddModalAnimating(true);
      });
    });
  };

  const closeAddModal = () => {
    setAddModalAnimating(false);
    setTimeout(() => {
      setAddModalVisible(false);
    }, 400);
  };

  const handleAddClient = async () => {
    if (!newClientName || !newClientPhone) return;
    setAddingClient(true);
    try {
      const fullName = newClientLastName 
        ? `${newClientName} ${newClientLastName}`.trim()
        : newClientName;
      const phone = '+380' + newClientPhone.replace(/\D/g, '');
      
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, phone, salonId }),
      });
      
      if (res.ok) {
        closeAddModal();
        loadClients();
      }
    } catch (error) {
      console.error('Error adding client:', error);
    } finally {
      setAddingClient(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 9);
    let formatted = '';
    if (digits.length > 0) formatted = digits.slice(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
    if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
    setNewClientPhone(formatted);
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('380')) {
      return `+380 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
    }
    return phone;
  };

  const getClientTags = (client: Client) => {
    const tags: { label: string; color: string }[] = [];
    
    if (client.visitsWithMaster >= 10) {
      tags.push({ label: 'VIP', color: 'bg-amber-100 text-amber-700' });
    } else if (client.visitsWithMaster >= 5) {
      tags.push({ label: 'Постійний', color: 'bg-green-100 text-green-700' });
    } else if (client.visitsWithMaster === 1) {
      tags.push({ label: 'Новий', color: 'bg-blue-100 text-blue-700' });
    }
    
    if (client.telegramChatId) {
      tags.push({ label: 'Telegram', color: 'bg-sky-100 text-sky-700' });
    }
    
    return tags;
  };

  const openClientCard = (client: Client) => {
    setSelectedClient(client);
    setEditForm({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      notes: client.notes || '',
      telegramUsername: client.telegramUsername || '',
    });
    setIsEditing(false);
    setIsPanelVisible(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsPanelAnimating(true);
      });
    });
  };

  const closeClientCard = () => {
    setIsPanelAnimating(false);
    setTimeout(() => {
      setIsPanelVisible(false);
      setSelectedClient(null);
      setIsEditing(false);
    }, 560);
  };

  const handleSaveClient = async () => {
    if (!selectedClient) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/staff/clients?masterId=${masterId}&clientId=${selectedClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setClients(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
        setSelectedClient(prev => prev ? { ...prev, ...updated } : null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving client:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-semibold text-lg">Мої клієнти</h1>
              <p className="text-xs text-muted-foreground">{clients.length} клієнтів</p>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <span className="text-xl font-light">+</span>
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Пошук за ім'ям або телефоном"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="px-4 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {search ? 'Клієнтів не знайдено' : 'У вас ще немає клієнтів'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => {
              const tags = getClientTags(client);
              return (
                <Card 
                  key={client.id}
                  className="p-3 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
                  onClick={() => openClientCard(client)}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center text-white font-medium shrink-0",
                      getAvatarColor(client.name)
                    )}>
                      {getInitials(client.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{client.name}</p>
                        {tags.length > 0 && (
                          <Badge className={cn("text-xs px-1.5 py-0", tags[0].color)}>
                            {tags[0].label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {client.visitsWithMaster} візитів • {client.spentWithMaster.toLocaleString()} ₴
                      </p>
                    </div>

                    {/* Quick call button - same size and shape as avatar */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`tel:${client.phone}`);
                      }}
                      className="h-12 w-12 rounded-2xl bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center text-emerald-600 transition-colors shrink-0"
                    >
                      <Phone className="h-5 w-5" />
                    </button>

                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Client Detail Slide-over */}
      {isPanelVisible && selectedClient && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            style={{
              opacity: isPanelAnimating ? 1 : 0,
              transition: 'opacity 560ms ease-out',
            }}
            onClick={closeClientCard}
          />

          {/* Panel */}
          <div 
            className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-background shadow-2xl z-50 flex flex-col overflow-hidden"
            style={{
              transform: isPanelAnimating ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 560ms ease-out',
            }}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6 pb-4">
              <button
                onClick={closeClientCard}
                className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-white/80 hover:bg-white shadow-md border border-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-gray-700" />
              </button>

              <div className="flex items-start gap-4">
                <div className={cn(
                  "h-16 w-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg",
                  getAvatarColor(selectedClient.name)
                )}>
                  {getInitials(selectedClient.name)}
                </div>
                
                <div className="flex-1">
                  {/* Name + pencil */}
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xl font-bold">{selectedClient.name}</h2>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {getClientTags(selectedClient).map((tag, idx) => (
                      <span 
                        key={idx}
                        className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", tag.color)}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 mt-4">
                <Button 
                  size="sm" 
                  className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => window.open(`tel:${selectedClient.phone}`)}
                >
                  <Phone className="h-4 w-4" />
                  Зателефонувати
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1 gap-2 bg-sky-500 hover:bg-sky-600 text-white"
                  onClick={() => {
                    if (selectedClient.telegramUsername) {
                      window.open(`https://t.me/${selectedClient.telegramUsername}`);
                    } else if (selectedClient.telegramChatId) {
                      window.open(`tg://user?id=${selectedClient.telegramChatId}`);
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
            <div className="grid grid-cols-3 gap-3 p-4 border-b">
              <div className="text-center">
                <p className="text-2xl font-bold">{selectedClient.visitsWithMaster}</p>
                <p className="text-xs text-muted-foreground">у вас</p>
              </div>
              <div className="text-center border-x">
                <p className="text-2xl font-bold">{selectedClient.spentWithMaster.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">₴ у вас</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{selectedClient.visitsCount}</p>
                <p className="text-xs text-muted-foreground">всього</p>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Contact info */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-sm text-muted-foreground">Контакти</h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    {isEditing ? 'Скасувати' : 'Редагувати'}
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {isEditing ? (
                      <Input
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <span className="text-sm">{formatPhone(selectedClient.phone)}</span>
                    )}
                  </div>
                  {(selectedClient.email || isEditing) && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {isEditing ? (
                        <Input
                          value={editForm.email}
                          onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="email@example.com"
                          className="h-8 text-sm"
                        />
                      ) : (
                        <span className="text-sm">{selectedClient.email}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    {isEditing ? (
                      <Input
                        value={editForm.telegramUsername}
                        onChange={(e) => setEditForm(prev => ({ ...prev, telegramUsername: e.target.value.replace('@', '') }))}
                        placeholder="username (без @)"
                        className="h-8 text-sm"
                      />
                    ) : selectedClient.telegramUsername ? (
                      <span className="text-sm">@{selectedClient.telegramUsername}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Не вказано</span>
                    )}
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
                    if (editForm.notes !== selectedClient.notes) {
                      try {
                        await fetch(`/api/staff/clients?masterId=${masterId}&clientId=${selectedClient.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ notes: editForm.notes }),
                        });
                        setSelectedClient(prev => prev ? { ...prev, notes: editForm.notes } : null);
                        setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, notes: editForm.notes } : c));
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
              {selectedClient.lastVisitWithMaster && (
                <Card className="p-4">
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Останній візит</h3>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(selectedClient.lastVisitWithMaster).toLocaleDateString('uk-UA', {
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
                  onClick={handleSaveClient}
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
          </div>
        </>
      )}

      {/* Add Client Modal */}
      {addModalVisible && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            style={{
              opacity: addModalAnimating ? 1 : 0,
              transition: 'opacity 400ms ease-out',
            }}
            onClick={closeAddModal}
          />
          
          {/* Modal - 60% height from bottom */}
          <div 
            className="fixed inset-x-0 bottom-0 bg-background rounded-t-3xl shadow-xl z-[110] flex flex-col"
            style={{
              maxHeight: '60vh',
              transform: addModalAnimating ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <h2 className="font-semibold text-lg">Новий клієнт</h2>
              <button
                onClick={closeAddModal}
                className="h-8 w-8 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Ім'я *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={newClientName}
                      onChange={(e) => setNewClientName(capitalizeWords(e.target.value))}
                      placeholder="Ім'я"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Прізвище</label>
                  <Input
                    value={newClientLastName}
                    onChange={(e) => setNewClientLastName(capitalizeWords(e.target.value))}
                    placeholder="Необов'язково"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Телефон *</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span className="text-base font-medium">+380</span>
                  </div>
                  <Input
                    type="tel"
                    value={newClientPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="XX XXX XX XX"
                    className="pl-[5.5rem] text-base"
                    maxLength={12}
                  />
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t shrink-0">
              <Button 
                className="w-full"
                onClick={handleAddClient}
                disabled={!newClientName || !newClientPhone || addingClient}
              >
                {addingClient ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Додати клієнта'
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
