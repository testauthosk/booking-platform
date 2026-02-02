'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { ChevronLeft, Loader2, Clock, Tag, Check } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  categoryName?: string;
  isEnabled: boolean;
}

export default function StaffServices() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

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
      loadServices();
    }
  }, [staffId]);

  const loadServices = async () => {
    setLoadingServices(true);
    try {
      const res = await fetch(`/api/staff/services?masterId=${staffId}`);
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Load services error:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  const toggleService = async (serviceId: string, enabled: boolean) => {
    // Optimistic update
    setServices(prev => prev.map(s => 
      s.id === serviceId ? { ...s, isEnabled: enabled } : s
    ));

    try {
      await fetch(`/api/staff/services`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterId: staffId, serviceId, enabled })
      });
    } catch (error) {
      console.error('Toggle service error:', error);
      // Revert on error
      setServices(prev => prev.map(s => 
        s.id === serviceId ? { ...s, isEnabled: !enabled } : s
      ));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group services by category
  const grouped = services.reduce((acc, service) => {
    const cat = service.categoryName || 'Інше';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const enabledCount = services.filter(s => s.isEnabled).length;

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
          <div className="flex-1">
            <h1 className="font-semibold text-lg">Мої послуги</h1>
            <p className="text-sm text-muted-foreground">
              {enabledCount} з {services.length} активних
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-32 space-y-4">
        {loadingServices ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : services.length > 0 ? (
          Object.entries(grouped).map(([category, categoryServices]) => (
            <div key={category}>
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {category}
              </h2>
              <div className="space-y-2">
                {categoryServices.map((service) => (
                  <Card 
                    key={service.id}
                    className={`p-4 transition-all ${!service.isEnabled ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Toggle */}
                      <button
                        onClick={() => toggleService(service.id, !service.isEnabled)}
                        className={`h-6 w-6 rounded-lg shrink-0 flex items-center justify-center transition-all ${
                          service.isEnabled 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted border border-border'
                        }`}
                      >
                        {service.isEnabled && <Check className="h-4 w-4" />}
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{service.name}</p>
                        {service.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{service.duration} хв</span>
                          </div>
                          <div className="flex items-center gap-1 font-medium">
                            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{service.price} ₴</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Tag className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">Немає послуг</p>
            <p className="text-sm text-muted-foreground">
              Адміністратор ще не додав послуги
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
