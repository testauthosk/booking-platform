'use client';

import { useState, useEffect } from 'react';
import { 
  X, Phone, Mail, MessageCircle, Calendar, Clock, 
  TrendingUp, Heart, Star, Edit2, Trash2, ChevronRight,
  Gift, Award, Tag, MoreHorizontal, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface Booking {
  id: string;
  date: string;
  time: string;
  serviceId?: string;
  serviceName: string;
  masterId?: string;
  masterName: string;
  price: number;
  status: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  telegramUsername?: string;
  telegramChatId?: string;
  visitsCount: number;
  totalSpent: number;
  lastVisit?: string;
  notes?: string;
  createdAt: string;
}

interface ClientCardProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
  onBook?: (client: Client, prefillService?: { id: string; name: string }) => void;
}

export function ClientCard({ client, isOpen, onClose, onEdit, onDelete, onBook }: ClientCardProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen && client.id) {
      fetchClientBookings();
    }
  }, [isOpen, client.id]);

  const fetchClientBookings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/bookings`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-violet-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500',
      'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatPhone = (phone: string) => {
    // Format +380XXXXXXXXX to +380 XX XXX XX XX
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('380')) {
      return `+380 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
    }
    return phone;
  };

  const getClientTags = () => {
    const tags: { label: string; color: string; icon: React.ReactNode }[] = [];
    
    if (client.visitsCount === 0) {
      tags.push({ label: 'Новий', color: 'bg-blue-100 text-blue-700', icon: <Star className="h-3 w-3" /> });
    } else if (client.visitsCount >= 10) {
      tags.push({ label: 'VIP', color: 'bg-amber-100 text-amber-700', icon: <Award className="h-3 w-3" /> });
    } else if (client.visitsCount >= 5) {
      tags.push({ label: 'Постійний', color: 'bg-green-100 text-green-700', icon: <Heart className="h-3 w-3" /> });
    }
    
    if (client.telegramChatId) {
      tags.push({ label: 'Telegram', color: 'bg-sky-100 text-sky-700', icon: <MessageCircle className="h-3 w-3" /> });
    }
    
    return tags;
  };

  const getAverageSpent = () => {
    if (client.visitsCount === 0) return 0;
    return Math.round(client.totalSpent / client.visitsCount);
  };

  // Get favorite services from bookings
  const getFavoriteServices = () => {
    const serviceCounts: Record<string, number> = {};
    bookings.forEach(b => {
      if (b.serviceName) {
        serviceCounts[b.serviceName] = (serviceCounts[b.serviceName] || 0) + 1;
      }
    });
    return Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  };

  const tags = getClientTags();
  const favoriteServices = getFavoriteServices();

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div 
        className={cn(
          "fixed inset-y-0 right-0 w-full sm:w-[420px] bg-background shadow-2xl z-50 transform transition-transform duration-300 ease-out overflow-hidden flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6 pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex items-start gap-4">
            <div className={cn(
              "h-16 w-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg",
              getAvatarColor(client.name)
            )}>
              {getInitials(client.name)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{client.name}</h2>
              
              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((tag, idx) => (
                    <span 
                      key={idx}
                      className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", tag.color)}
                    >
                      {tag.icon}
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
              variant="secondary" 
              size="sm" 
              className="flex-1 gap-2"
              onClick={() => window.open(`tel:${client.phone}`)}
            >
              <Phone className="h-4 w-4" />
              Зателефонувати
            </Button>
            {client.telegramUsername && (
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex-1 gap-2"
                onClick={() => window.open(`https://t.me/${client.telegramUsername}`)}
              >
                <Send className="h-4 w-4" />
                Telegram
              </Button>
            )}
          </div>

          {/* Repeat booking button */}
          <Button 
            className="w-full mt-3 gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25"
            onClick={() => onBook?.(client)}
          >
            <Calendar className="h-4 w-4" />
            Повторний запис
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 p-4 border-b">
          <div className="text-center">
            <p className="text-2xl font-bold">{client.visitsCount}</p>
            <p className="text-xs text-muted-foreground">візитів</p>
          </div>
          <div className="text-center border-x">
            <p className="text-2xl font-bold">{client.totalSpent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">₴ всього</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{getAverageSpent()}</p>
            <p className="text-xs text-muted-foreground">₴ середній</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 mx-4 mt-2">
            <TabsTrigger value="overview">Огляд</TabsTrigger>
            <TabsTrigger value="history">Історія</TabsTrigger>
            <TabsTrigger value="info">Інфо</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            {/* Overview Tab */}
            <TabsContent value="overview" className="p-4 space-y-4 mt-0">
              {/* Contact info */}
              <Card className="p-4 space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground">Контакти</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatPhone(client.phone)}</span>
                  </div>
                  {client.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{client.email}</span>
                    </div>
                  )}
                  {client.telegramUsername && (
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">@{client.telegramUsername}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Favorite services */}
              {favoriteServices.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-medium text-sm text-muted-foreground mb-3">Улюблені послуги</h3>
                  <div className="space-y-2">
                    {favoriteServices.map((service, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-rose-500" />
                          <span className="text-sm">{service.name}</span>
                        </div>
                        <Badge variant="secondary">{service.count}x</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Last visit */}
              {client.lastVisit && (
                <Card className="p-4">
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Останній візит</h3>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatDate(client.lastVisit)}</span>
                  </div>
                </Card>
              )}

              {/* Notes */}
              {client.notes && (
                <Card className="p-4">
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Нотатки</h3>
                  <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
                </Card>
              )}

              {/* Quick book button removed - now in header */}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="p-4 mt-0">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Завантаження...
                </div>
              ) : bookings.length > 0 ? (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <Card key={booking.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{booking.serviceName}</p>
                          <p className="text-xs text-muted-foreground">
                            {booking.masterName} • {formatDate(booking.date)} о {booking.time}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="font-medium text-sm">{booking.price} ₴</p>
                          <div className="flex items-center gap-1">
                            <Badge 
                              variant={booking.status === 'COMPLETED' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {booking.status === 'COMPLETED' ? '✓' : 
                               booking.status === 'CANCELLED' ? '✗' : 
                               booking.status === 'NO_SHOW' ? '?' : '○'}
                            </Badge>
                            {booking.status === 'COMPLETED' && booking.serviceId && (
                              <button
                                onClick={() => onBook?.(client, { id: booking.serviceId!, name: booking.serviceName })}
                                className="text-xs text-primary hover:underline"
                              >
                                Повторити
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Ще немає записів</p>
                </div>
              )}
            </TabsContent>

            {/* Info Tab */}
            <TabsContent value="info" className="p-4 space-y-4 mt-0">
              <Card className="p-4 space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground">Деталі</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Клієнт з</span>
                    <span>{formatDate(client.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID</span>
                    <span className="font-mono text-xs">{client.id.slice(0, 8)}...</span>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => onEdit(client)}
                >
                  <Edit2 className="h-4 w-4" />
                  Редагувати клієнта
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(client.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Видалити клієнта
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </>
  );
}
