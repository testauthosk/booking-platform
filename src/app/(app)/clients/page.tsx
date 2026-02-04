'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, Plus, Filter, Menu, Bell, ChevronRight, Loader2, Users } from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';
import { MigrationBanner } from '@/components/migration/migration-banner';
import { ImportModal } from '@/components/migration/import-modal';
import { ClientCard } from '@/components/clients/client-card';
import { RepeatBookingModal } from '@/components/clients/repeat-booking-modal';

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

interface BookingClient {
  id: string;
  name: string;
  phone: string;
}

interface SalonInfo {
  previousPlatform?: string;
  migrationDismissed: boolean;
}

const DEFAULT_SALON_ID = '93b6801f-0193-4706-896b-3de71f3799e1';

export default function ClientsPage() {
  const { data: session } = useSession();
  const { open: openSidebar } = useSidebar();
  const [search, setSearch] = useState('');
  const salonId = session?.user?.salonId || DEFAULT_SALON_ID;
  const [clients, setClients] = useState<Client[]>([]);
  const [salonInfo, setSalonInfo] = useState<SalonInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [bookingClient, setBookingClient] = useState<BookingClient | null>(null);
  const [bookingPrefillService, setBookingPrefillService] = useState<{ id: string; name: string } | undefined>();

  // Завантаження клієнтів та інфо про салон
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, salonRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/salon')
        ]);

        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          setClients(clientsData);
        }

        if (salonRes.ok) {
          const salonData = await salonRes.json();
          setSalonInfo({
            previousPlatform: salonData.previousPlatform,
            migrationDismissed: salonData.migrationDismissed || false,
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    (client.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
    client.phone.includes(search)
  );

  const handleDismissMigration = async () => {
    try {
      await fetch('/api/salon/migration', { method: 'POST' });
      setSalonInfo(prev => prev ? { ...prev, migrationDismissed: true } : null);
    } catch (error) {
      console.error('Error dismissing migration:', error);
    }
  };

  const handleImport = async (importClients: Array<{
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    visitsCount?: number;
    totalSpent?: number;
  }>) => {
    const response = await fetch('/api/clients/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients: importClients }),
    });

    if (!response.ok) {
      throw new Error('Import failed');
    }

    const result = await response.json();

    // Оновлюємо список клієнтів
    const clientsRes = await fetch('/api/clients');
    if (clientsRes.ok) {
      const clientsData = await clientsRes.json();
      setClients(clientsData);
    }

    return result;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleEditClient = (client: Client) => {
    // TODO: відкрити модалку редагування
    console.log('Edit client:', client);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Ви впевнені що хочете видалити цього клієнта?')) return;
    
    try {
      const res = await fetch(`/api/clients?id=${clientId}`, { method: 'DELETE' });
      if (res.ok) {
        setClients(prev => prev.filter(c => c.id !== clientId));
        setSelectedClient(null);
      }
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  // Показувати банер якщо є previousPlatform, не закрито, і клієнтів мало
  const showMigrationBanner = salonInfo?.previousPlatform && 
    !salonInfo.migrationDismissed && 
    salonInfo.previousPlatform !== 'none' &&
    clients.length < 50;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-20">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 transition-transform active:scale-95" 
          onClick={openSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <h1 className="text-base font-semibold">Клієнти</h1>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 relative transition-transform active:scale-95">
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
            <h1 className="text-2xl font-bold">Клієнти</h1>
            <p className="text-muted-foreground">
              Переглядайте, додавайте та керуйте клієнтами
            </p>
          </div>
          <Button className="transition-transform active:scale-95">
            <Plus className="h-4 w-4 mr-2" />
            Додати
          </Button>
        </div>

        {/* Migration banner */}
        {showMigrationBanner && (
          <MigrationBanner
            previousPlatform={salonInfo.previousPlatform!}
            clientsCount={clients.length}
            onStartMigration={() => setIsImportOpen(true)}
            onDismiss={handleDismissMigration}
          />
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Завантаження...</p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ім'я, email або телефон"
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="shrink-0 transition-transform active:scale-95">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Clients count */}
            <p className="text-sm text-muted-foreground mb-3">
              {filteredClients.length} клієнтів
            </p>

            {/* Clients list */}
            {filteredClients.length > 0 ? (
              <div className="space-y-2">
                {filteredClients.map((client) => (
                  <Card 
                    key={client.id} 
                    className="p-4 transition-all hover:shadow-md active:scale-[0.99] cursor-pointer"
                    onClick={() => setSelectedClient(client)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-lg">
                          {getInitials(client.name)}
                        </div>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {client.visitsCount} візитів • {client.totalSpent.toLocaleString()} ₴
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : clients.length === 0 ? (
              /* Empty state - no clients at all */
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium mb-1">Поки немає клієнтів</p>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Додайте першого клієнта вручну або імпортуйте базу
                </p>
                {salonInfo?.previousPlatform && salonInfo.previousPlatform !== 'none' && (
                  <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                    Імпортувати з {salonInfo.previousPlatform}
                  </Button>
                )}
              </div>
            ) : (
              /* Empty state - search no results */
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Клієнтів не знайдено</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile FAB */}
      <Button 
        className="lg:hidden fixed right-4 bottom-24 w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        previousPlatform={salonInfo?.previousPlatform || 'other'}
        onImport={handleImport}
      />

      {/* Client Card */}
      {selectedClient && (
        <ClientCard
          client={selectedClient}
          isOpen={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          onEdit={handleEditClient}
          onDelete={handleDeleteClient}
          onBook={(client, prefillService) => {
            // Відкриваємо модалку повторного запису
            setBookingClient({
              id: client.id,
              name: client.name,
              phone: client.phone,
            });
            setBookingPrefillService(prefillService);
          }}
        />
      )}

      {/* Repeat Booking Modal */}
      {bookingClient && (
        <RepeatBookingModal
          isOpen={!!bookingClient}
          onClose={() => {
            setBookingClient(null);
            setBookingPrefillService(undefined);
          }}
          client={bookingClient}
          prefillService={bookingPrefillService}
          salonId={salonId}
          onSuccess={() => {
            // Можна оновити список або показати повідомлення
          }}
        />
      )}
    </div>
  );
}
