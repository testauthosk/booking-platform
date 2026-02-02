'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Loader2, Clock, Tag, Check, X, Edit2, Plus } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  basePrice: number;
  categoryName?: string;
  isEnabled: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function StaffServices() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState('');
  const [salonId, setSalonId] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  
  // New service form
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('30');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('');
  const [creatingService, setCreatingService] = useState(false);

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

  useEffect(() => {
    if (staffId) {
      loadServices();
    }
  }, [staffId]);

  useEffect(() => {
    if (salonId) {
      loadCategories();
    }
  }, [salonId]);

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

  const loadCategories = async () => {
    try {
      const res = await fetch(`/api/staff/categories?salonId=${salonId}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Load categories error:', error);
    }
  };

  const startEditing = (service: Service) => {
    setEditingId(service.id);
    setEditPrice(service.price.toString());
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditPrice('');
  };

  const savePrice = async (serviceId: string) => {
    const newPrice = parseInt(editPrice);
    if (isNaN(newPrice) || newPrice < 0) return;

    setSaving(true);
    
    // Optimistic update
    setServices(prev => prev.map(s => 
      s.id === serviceId ? { ...s, price: newPrice } : s
    ));

    try {
      await fetch(`/api/staff/services`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          masterId: staffId, 
          serviceId, 
          enabled: true,
          customPrice: newPrice 
        })
      });
      setEditingId(null);
    } catch (error) {
      console.error('Save price error:', error);
      loadServices(); // Reload on error
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (serviceId: string) => {
    // Optimistic update
    setServices(prev => prev.filter(s => s.id !== serviceId));
    
    try {
      await fetch(`/api/staff/services?masterId=${staffId}&serviceId=${serviceId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Delete service error:', error);
      loadServices(); // Reload on error
    }
  };

  const openAddModal = () => {
    setNewServiceName('');
    setNewServiceDuration('30');
    setNewServicePrice('');
    setNewServiceDescription('');
    setNewServiceCategory('');
    setAddModalOpen(true);
  };

  const createService = async () => {
    if (!newServiceName || !newServicePrice || !salonId) {
      console.log('Missing fields:', { newServiceName, newServicePrice, salonId });
      return;
    }
    
    setCreatingService(true);
    try {
      const res = await fetch('/api/staff/services/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          masterId: staffId,
          name: newServiceName,
          duration: parseInt(newServiceDuration) || 30,
          price: parseInt(newServicePrice),
          description: newServiceDescription || null,
          categoryId: newServiceCategory || null
        })
      });
      
      if (res.ok) {
        setAddModalOpen(false);
        loadServices();
      }
    } catch (error) {
      console.error('Create service error:', error);
    } finally {
      setCreatingService(false);
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
          <div className="flex-1">
            <h1 className="font-semibold text-lg">Мої послуги</h1>
            <p className="text-sm text-muted-foreground">
              {services.length} послуг
            </p>
          </div>
          <button 
            onClick={openAddModal}
            className="h-9 w-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-5 w-5 stroke-[3]" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-40 space-y-3">
        {loadingServices ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : services.length > 0 ? (
          services.map((service) => (
            <Card key={service.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{service.name}</p>
                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{service.description}</p>
                  )}
                  
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{service.duration} хв</span>
                    </div>
                    
                    {/* Price - editable */}
                    {editingId === service.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="h-7 w-20 text-sm px-2"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') savePrice(service.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                        <span className="text-sm">₴</span>
                        <button
                          onClick={() => savePrice(service.id)}
                          disabled={saving}
                          className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(service)}
                        className="flex items-center gap-1 text-sm font-medium hover:text-primary"
                      >
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{service.price} ₴</span>
                        <Edit2 className="h-3 w-3 text-muted-foreground ml-1" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Delete button */}
                <button
                  onClick={() => deleteService(service.id)}
                  className="h-8 w-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Tag className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">Немає послуг</p>
            <p className="text-sm text-muted-foreground mb-4">
              Додайте свої послуги
            </p>
            <button 
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium"
            >
              <Plus className="h-4 w-4" />
              Додати послугу
            </button>
          </div>
        )}
      </div>

      {/* Add Service Modal */}
      {addModalOpen && (
        <div 
          className="fixed inset-0 bg-white/20 backdrop-blur-sm z-40"
          onClick={() => setAddModalOpen(false)}
        />
      )}
      <div 
        className={`fixed inset-x-0 bottom-0 max-h-[85vh] bg-card rounded-t-3xl shadow-xl z-50 transform transition-transform duration-500 ease-out overflow-hidden flex flex-col ${
          addModalOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="font-semibold">Нова послуга</h2>
          <button 
            onClick={() => setAddModalOpen(false)}
            className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Назва послуги *</label>
            <Input
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="Наприклад: Стрижка"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Категорія</label>
            <select
              value={newServiceCategory}
              onChange={(e) => setNewServiceCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            >
              <option value="">Без категорії</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Категорії створює адміністратор
              </p>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Тривалість (хв)</label>
            <Input
              type="number"
              value={newServiceDuration}
              onChange={(e) => setNewServiceDuration(e.target.value)}
              placeholder="30"
            />
          </div>

          {/* Price */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Ціна (₴) *</label>
            <Input
              type="number"
              value={newServicePrice}
              onChange={(e) => setNewServicePrice(e.target.value)}
              placeholder="500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Опис (необовʼязково)</label>
            <Input
              value={newServiceDescription}
              onChange={(e) => setNewServiceDescription(e.target.value)}
              placeholder="Короткий опис послуги"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pb-8 border-t border-border shrink-0">
          <button
            onClick={createService}
            disabled={creatingService || !newServiceName || !newServicePrice}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {creatingService ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Check className="h-5 w-5" />
                Створити
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
