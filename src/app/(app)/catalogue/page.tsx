'use client';
import { NotificationBell } from '@/components/notifications/notification-bell';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Menu,
  Bell,
  Clock,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  FolderPlus,
  Loader2,
} from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ServiceModal } from '@/components/catalogue/service-modal';
import { CategoryModal } from '@/components/catalogue/category-modal';
import { useAuth } from '@/contexts/AuthContext';

interface Service {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  price: number;
  priceFrom: boolean;
  duration: number;
  category?: Category;
}

interface Category {
  id: string;
  name: string;
  services?: Service[];
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} хв`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} год`;
  return `${hours} год ${mins} хв`;
}

export default function CataloguePage() {
  const { open: openSidebar } = useSidebar();
  const { user } = useAuth();
  const salonId = user?.salonId;
  
  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Modals
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    type: 'service' | 'category';
    id: string;
    name: string;
  } | null>(null);

  // Load data
  useEffect(() => {
    if (salonId) {
      loadData();
    }
  }, [salonId]);

  const loadData = async () => {
    if (!salonId) return;
    
    // Only show loading on initial load
    if (services.length === 0) {
      setLoading(true);
    }
    try {
      // Один запрос вместо двух
      const res = await fetch(`/api/catalogue?salonId=${salonId}`);
      
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setServices(data.services || []);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter services
  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === 'all' || service.categoryId === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedServices = filteredServices.reduce((acc, service) => {
    const catId = service.categoryId || 'uncategorized';
    const catName = service.category?.name || 'Без категорії';
    if (!acc[catId]) {
      acc[catId] = { name: catName, services: [] };
    }
    acc[catId].services.push(service);
    return acc;
  }, {} as Record<string, { name: string; services: Service[] }>);

  // Service CRUD
  const handleSaveService = async (data: Partial<Service>) => {
    const url = editingService
      ? `/api/services/${editingService.id}`
      : '/api/services';
    const method = editingService ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        salonId: salonId,
      }),
    });

    if (res.ok) {
      await loadData();
    } else {
      throw new Error('Failed to save');
    }
  };

  const handleDeleteService = async (id: string) => {
    const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadData();
    }
  };

  // Category CRUD
  const handleSaveCategory = async (data: { name: string }) => {
    const url = editingCategory
      ? `/api/categories/${editingCategory.id}`
      : '/api/categories';
    const method = editingCategory ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        salonId: salonId,
      }),
    });

    if (res.ok) {
      await loadData();
    } else {
      throw new Error('Failed to save');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadData();
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteDialog) return;
    
    if (deleteDialog.type === 'service') {
      await handleDeleteService(deleteDialog.id);
    } else {
      await handleDeleteCategory(deleteDialog.id);
    }
    setDeleteDialog(null);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile header */}
      <header
        className="lg:hidden bg-white border-b border-gray-200 shrink-0 z-20 sticky top-0"
        style={{ height: 56, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <button
          onClick={openSidebar}
          className="shrink-0 active:scale-95 transition-transform"
          style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Menu className="text-gray-700" style={{ width: 18, height: 18 }} />
        </button>

        <h1 className="flex-1 text-center text-base font-semibold truncate">Каталог</h1>

        <div className="flex items-center shrink-0" style={{ gap: 8 }}>
          <NotificationBell />
          <div
            className="bg-orange-500 text-white text-sm font-medium shrink-0"
            style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            D
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {/* Desktop title */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Меню послуг</h1>
            <p className="text-muted-foreground">
              Переглядайте та керуйте послугами вашого закладу
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingCategory(null);
                setCategoryModalOpen(true);
              }}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Категорія
            </Button>
            <Button
              onClick={() => {
                setEditingService(null);
                setServiceModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Послуга
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Пошук послуги"
              className="pl-10 h-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Categories filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <Button
            variant={activeCategory === 'all' ? 'secondary' : 'outline'}
            size="sm"
            className="shrink-0"
            onClick={() => setActiveCategory('all')}
          >
            Всі ({services.length})
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? 'secondary' : 'outline'}
              size="sm"
              className="shrink-0"
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Services by category */}
        {!loading && (
          <div className="space-y-4">
            {Object.entries(groupedServices).map(([catId, { name, services: catServices }]) => (
              <Card key={catId} className="overflow-hidden">
                <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                  <h3 className="font-medium">{name}</h3>
                  {catId !== 'uncategorized' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            const cat = categories.find((c) => c.id === catId);
                            if (cat) {
                              setEditingCategory(cat);
                              setCategoryModalOpen(true);
                            }
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Редагувати
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            setDeleteDialog({
                              type: 'category',
                              id: catId,
                              name,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Видалити
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="divide-y">
                  {catServices.map((service) => (
                    <div
                      key={service.id}
                      className="p-4 transition-all hover:bg-muted/50 flex items-center justify-between group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{service.name}</p>
                        {service.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {service.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(service.duration)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold whitespace-nowrap">
                          {service.priceFrom && (
                            <span className="text-muted-foreground font-normal">від </span>
                          )}
                          {service.price} ₴
                        </p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingService(service);
                                setServiceModalOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Редагувати
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                setDeleteDialog({
                                  type: 'service',
                                  id: service.id,
                                  name: service.name,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Видалити
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredServices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              {search ? 'Послуг не знайдено' : 'Додайте першу послугу'}
            </p>
            {!search && (
              <Button
                onClick={() => {
                  setEditingService(null);
                  setServiceModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Додати послугу
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Mobile FABs */}
      <div className="lg:hidden fixed right-4 bottom-24 flex flex-col gap-2">
        <Button
          variant="outline"
          size="icon"
          className="w-12 h-12 rounded-full shadow-lg bg-background"
          onClick={() => {
            setEditingCategory(null);
            setCategoryModalOpen(true);
          }}
        >
          <FolderPlus className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          className="w-14 h-14 rounded-full shadow-lg"
          onClick={() => {
            setEditingService(null);
            setServiceModalOpen(true);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Modals */}
      <ServiceModal
        isOpen={serviceModalOpen}
        onClose={() => {
          setServiceModalOpen(false);
          setEditingService(null);
        }}
        onSave={handleSaveService}
        onAddCategory={() => {
          setEditingCategory(null);
          setCategoryModalOpen(true);
        }}
        service={editingService}
        categories={categories}
      />

      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        category={editingCategory}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Видалити {deleteDialog?.type === 'category' ? 'категорію' : 'послугу'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.type === 'category'
                ? `Категорія "${deleteDialog?.name}" буде видалена. Послуги залишаться без категорії.`
                : `Послуга "${deleteDialog?.name}" буде видалена.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
