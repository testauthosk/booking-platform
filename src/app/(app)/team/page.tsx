'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Plus, Filter, MoreVertical, Menu, Clock, UserPlus, Loader2, Copy, Check, Mail, ChevronRight, Trash2, ExternalLink, Eye, X, Send } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useSidebar } from '@/components/sidebar-context';
import { useCalendarSettings } from '@/lib/calendar-settings-context';

const DEMO_SALON_ID = 'demo-salon-id';

interface Master {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatar?: string;
  isActive: boolean;
}

interface Invitation {
  id: string;
  email: string;
  name?: string;
  role?: string;
  isUsed: boolean;
  token: string;
  expiresAt: string;
  viewedAt?: string;
  createdAt: string;
}

export default function TeamPage() {
  const { open: openSidebar } = useSidebar();
  const { getColorForIndex } = useCalendarSettings();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [masters, setMasters] = useState<Master[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  
  // Invite modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Invitation details modal
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resending, setResending] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean; isError?: boolean } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mastersRes, invitationsRes] = await Promise.all([
        fetch(`/api/masters?salonId=${DEMO_SALON_ID}`),
        fetch(`/api/invitations?salonId=${DEMO_SALON_ID}`),
      ]);
      
      if (mastersRes.ok) {
        const data = await mastersRes.json();
        setMasters(data);
      }
      
      if (invitationsRes.ok) {
        const data = await invitationsRes.json();
        setInvitations(data.filter((i: Invitation) => !i.isUsed));
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviting(true);

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: DEMO_SALON_ID,
          email: inviteEmail,
          name: inviteName || undefined,
          role: inviteRole || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error || 'Failed to create invitation');
        return;
      }

      // Показываем ссылку
      const link = `${window.location.origin}/join/${data.token}`;
      setInviteLink(link);
      
      // Обновляем список
      loadData();
    } catch (error) {
      setInviteError('Something went wrong');
    } finally {
      setInviting(false);
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeInviteModal = () => {
    setInviteModalOpen(false);
    setInviteEmail('');
    setInviteName('');
    setInviteRole('');
    setInviteError(null);
    setInviteLink(null);
  };

  const handleDeleteInvitation = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/invitations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedInvitation(null);
        loadData();
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeleting(false);
    }
  };

  const showToast = (message: string, isError = false) => {
    setToast({ message, visible: true, isError });
    setTimeout(() => {
      setToast(prev => prev ? { ...prev, visible: false } : null);
      setTimeout(() => setToast(null), 300);
    }, 5000);
  };

  const hideToast = () => {
    if (toast) {
      setToast({ ...toast, visible: false });
      setTimeout(() => setToast(null), 300);
    }
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    setResending(true);
    try {
      const res = await fetch(`/api/invitations/${invitation.id}/resend`, { method: 'POST' });
      if (res.ok) {
        showToast('Запрошення відправлено повторно!');
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('Resend error:', data);
        showToast('Помилка при відправці', true);
      }
    } catch (error) {
      console.error('Resend error:', error);
      showToast('Помилка при відправці', true);
    } finally {
      setResending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredMasters = masters.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const getAvatarColor = (index: number) => {
    const colors = ['bg-orange-500', 'bg-pink-500', 'bg-purple-500', 'bg-blue-500', 'bg-green-500'];
    return colors[index % colors.length];
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-20">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 rounded-xl border border-border" 
          onClick={openSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <h1 className="text-base font-semibold">Команда</h1>

        <div className="flex items-center gap-1">
          <NotificationBell />
          <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center text-white text-sm font-medium">
            D
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {/* Desktop title */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Команда</h1>
            <p className="text-muted-foreground">Учасники команди</p>
          </div>
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Запросити майстра
          </Button>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Пошук учасників команди" 
              className="pl-10 h-10 rounded-xl" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0">
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Masters list */}
        {!loading && (
          <div className="space-y-2">
            {filteredMasters.map((master, index) => (
              <Card 
                key={master.id} 
                className="p-4 transition-all hover:shadow-md cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-full ${getAvatarColor(index)} flex items-center justify-center text-white font-medium text-lg`}>
                      {master.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{master.name}</p>
                      <p className="text-sm text-muted-foreground">{master.role || 'Майстер'}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}

            {/* Pending invitations */}
            {invitations.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground mt-6 mb-2">Очікують підтвердження</p>
                {invitations.map((invitation) => (
                  <Card 
                    key={invitation.id} 
                    className="p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedInvitation(invitation)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center relative">
                          <Mail className="h-5 w-5 text-gray-500" />
                          {invitation.viewedAt && (
                            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{invitation.name || invitation.email}</p>
                          <p className="text-sm text-muted-foreground">
                            {invitation.viewedAt ? 'Відкрив посилання' : 'Очікує'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredMasters.length === 0 && invitations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <UserPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">Додайте першого майстра</p>
            <Button onClick={() => setInviteModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Запросити майстра
            </Button>
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <Button 
        className="lg:hidden fixed right-4 bottom-24 w-14 h-14 rounded-full shadow-lg"
        size="icon"
        onClick={() => setInviteModalOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Invite Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={closeInviteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Запросити майстра</DialogTitle>
          </DialogHeader>
          
          {!inviteLink ? (
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="master@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Ім'я</Label>
                <Input
                  id="name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ім'я майстра"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Посада</Label>
                <Input
                  id="role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  placeholder="Барбер, Стиліст..."
                />
              </div>

              {inviteError && (
                <p className="text-sm text-destructive">{inviteError}</p>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={closeInviteModal}>
                  Скасувати
                </Button>
                <Button type="submit" className="flex-1" disabled={inviting}>
                  {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Створити запрошення
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Запрошення створено! Надішліть це посилання майстру:
              </p>
              
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Посилання дійсне 7 днів
              </p>

              <Button className="w-full" onClick={closeInviteModal}>
                Готово
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invitation Details Modal */}
      <Dialog open={!!selectedInvitation} onOpenChange={() => setSelectedInvitation(null)}>
        <DialogContent 
          className="sm:max-w-md p-0 overflow-hidden"
          showCloseButton={false}
          style={{ 
            borderColor: getColorForIndex(0),
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
        >
          <div className="p-6">
            {/* Header with centered title and close button */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-10" /> {/* Spacer for centering */}
              <DialogTitle className="text-center flex-1">Деталі запрошення</DialogTitle>
              <button
                onClick={() => setSelectedInvitation(null)}
                className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="h-6 w-6 text-muted-foreground" />
              </button>
            </div>
            
            {selectedInvitation && (
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  {selectedInvitation.viewedAt ? (
                    <>
                      <div 
                        className="h-10 w-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${getColorForIndex(2)}20` }}
                      >
                        <Eye className="h-5 w-5" style={{ color: getColorForIndex(2) }} />
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: getColorForIndex(2) }}>Посилання відкрито</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(selectedInvitation.viewedAt)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div 
                        className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${getColorForIndex(1)}20` }}
                      >
                        <Clock className="h-5 w-5" style={{ color: getColorForIndex(1) }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium" style={{ color: getColorForIndex(1) }}>Очікує відкриття</p>
                        <p className="text-xs text-muted-foreground">Майстер ще не переходив</p>
                      </div>
                      <button
                        onClick={() => handleResendInvitation(selectedInvitation)}
                        disabled={resending}
                        className="h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                        style={{ 
                          backgroundColor: `${getColorForIndex(1)}15`,
                          color: getColorForIndex(1)
                        }}
                      >
                        {resending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        Ще раз
                      </button>
                    </>
                  )}
                </div>

              {/* Info */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{selectedInvitation.email}</span>
                </div>
                {selectedInvitation.name && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Ім'я</span>
                    <span className="text-sm font-medium">{selectedInvitation.name}</span>
                  </div>
                )}
                {selectedInvitation.role && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Посада</span>
                    <span className="text-sm font-medium">{selectedInvitation.role}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Створено</span>
                  <span className="text-sm">{formatDate(selectedInvitation.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Дійсне до</span>
                  <span className="text-sm">{formatDate(selectedInvitation.expiresAt)}</span>
                </div>
              </div>

              {/* Link */}
              <div className="space-y-2">
                <Label>Посилання</Label>
                <div className="flex gap-2 items-center">
                  <Input 
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${selectedInvitation.token}`} 
                    readOnly 
                    className="text-xs h-10 flex-1" 
                  />
                  <button 
                    className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/join/${selectedInvitation.token}`);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleDeleteInvitation(selectedInvitation.id)}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Скасувати запрошення
                </Button>
              </div>
            </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fixed Toast */}
      {toast && (
        <div 
          onClick={hideToast}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all duration-300 ${
            toast.isError 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-green-50 border border-green-200'
          } ${
            toast.visible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 -translate-y-2'
          }`}
        >
          {toast.isError ? (
            <X className="h-4 w-4 text-red-600" />
          ) : (
            <Check className="h-4 w-4 text-green-600" />
          )}
          <p className={`text-sm font-medium ${toast.isError ? 'text-red-700' : 'text-green-700'}`}>
            {toast.message}
          </p>
        </div>
      )}
    </div>
  );
}
