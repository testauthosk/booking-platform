'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Package, 
  AlertTriangle, 
  Menu,
  MoreVertical,
  ArrowUpCircle,
  ArrowDownCircle,
  Edit,
  Trash2,
} from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';
import { NotificationBell } from '@/components/notifications/notification-bell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProductModal } from '@/components/inventory/product-modal';
import { MovementModal } from '@/components/inventory/movement-modal';

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  costPrice: number;
  sellPrice: number;
  quantity: number;
  minQuantity: number;
  unit: string;
  image: string | null;
  isActive: boolean;
  category: {
    id: string;
    name: string;
  } | null;
}

export default function InventoryPage() {
  const { open: openSidebar } = useSidebar();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  
  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/inventory/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Видалити цей товар?')) return;
    
    try {
      const res = await fetch(`/api/inventory/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(products.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleAddStock = (product: Product) => {
    setSelectedProduct(product);
    setMovementType('IN');
    setMovementModalOpen(true);
  };

  const handleRemoveStock = (product: Product) => {
    setSelectedProduct(product);
    setMovementType('OUT');
    setMovementModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setProductModalOpen(true);
  };

  const handleNewProduct = () => {
    setSelectedProduct(null);
    setProductModalOpen(true);
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesLowStock = !showLowStock || p.quantity <= p.minQuantity;
    return matchesSearch && matchesLowStock;
  });

  // Stats
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.quantity <= p.minQuantity).length;
  const totalValue = products.reduce((sum, p) => sum + (p.costPrice * p.quantity), 0);

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
        
        <h1 className="flex-1 text-center text-base font-semibold truncate">Склад</h1>

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
      <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-4">
        {/* Desktop title */}
        <div className="hidden lg:flex items-center justify-between">
          <h1 className="text-2xl font-bold">Склад товарів</h1>
          <Button onClick={handleNewProduct}>
            <Plus className="h-4 w-4 mr-2" />
            Додати товар
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-lg font-bold">{totalProducts}</p>
                <p className="text-xs text-muted-foreground">Товарів</p>
              </div>
            </div>
          </Card>
          
          <Card className={`p-3 ${lowStockCount > 0 ? 'border-orange-500' : ''}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${lowStockCount > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-lg font-bold">{lowStockCount}</p>
                <p className="text-xs text-muted-foreground">Закінчується</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div>
              <p className="text-lg font-bold">{totalValue.toLocaleString()} ₴</p>
              <p className="text-xs text-muted-foreground">На складі</p>
            </div>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Пошук товару..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button 
            variant={showLowStock ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowLowStock(!showLowStock)}
          >
            <AlertTriangle className="h-4 w-4" />
          </Button>
        </div>

        {/* Products list */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Завантаження...</div>
        ) : filteredProducts.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {search ? 'Товарів не знайдено' : 'Додайте перший товар'}
            </p>
            {!search && (
              <Button className="mt-4" onClick={handleNewProduct}>
                <Plus className="h-4 w-4 mr-2" />
                Додати товар
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className={`p-3 ${product.quantity <= product.minQuantity ? 'border-orange-500' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {/* Image or placeholder */}
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium truncate">{product.name}</p>
                        {product.category && (
                          <p className="text-xs text-muted-foreground">{product.category.name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{product.sellPrice} ₴</p>
                        <p className="text-xs text-muted-foreground">собів. {product.costPrice} ₴</p>
                      </div>
                    </div>
                    
                    {/* Stock */}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${product.quantity <= product.minQuantity ? 'text-orange-500' : ''}`}>
                          {product.quantity} {product.unit}
                        </span>
                        {product.quantity <= product.minQuantity && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                      
                      {/* Quick actions */}
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleAddStock(product)}
                        >
                          <ArrowUpCircle className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleRemoveStock(product)}
                        >
                          <ArrowDownCircle className="h-4 w-4 text-red-500" />
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(product)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Редагувати
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(product.id)}
                              className="text-red-500"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Видалити
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Mobile FAB */}
        <Button
          className="lg:hidden fixed right-4 bottom-[76px] h-14 w-14 rounded-2xl shadow-lg"
          onClick={handleNewProduct}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Modals */}
      <ProductModal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        product={selectedProduct}
        onSave={() => {
          setProductModalOpen(false);
          fetchProducts();
        }}
      />

      <MovementModal
        open={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        product={selectedProduct}
        type={movementType}
        onSave={() => {
          setMovementModalOpen(false);
          fetchProducts();
        }}
      />
    </div>
  );
}
