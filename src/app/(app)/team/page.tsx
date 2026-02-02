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
import { Search, Plus, Filter, MoreVertical, Menu, Bell, Clock, UserPlus, Loader2, Copy, Check, Mail } from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';

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
}

export default function TeamPage() {
  const { open: openSidebar } = useSidebar();
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
          className="h-9 w-9" 
          onClick={openSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <h1 className="text-base font-semibold">Команда</h1>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>
          <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-medium">
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
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Пошук учасників команди" 
              className="pl-10" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0">
            <Filter className="h-4 w-4" />
          </Button>
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
                    className="p-4 bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium">{invitation.name || invitation.email}</p>
                          <p className="text-sm text-muted-foreground">Запрошення надіслано</p>
                        </div>
                      </div>
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
    </div>
  );
}
