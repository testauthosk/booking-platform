'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package,
  Search,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Store,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  costPrice: number;
  sellPrice: number;
  quantity: number;
  minQuantity: number;
  unit: string;
  isActive: boolean;
  salon: { id: string; name: string };
  category: { id: string; name: string } | null;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  createdAt: string;
  product: { name: string };
}

interface Stats {
  totalProducts: number;
  lowStockCount: number;
  totalCostValue: number;
  totalSellValue: number;
  potentialProfit: number;
}

interface Salon {
  id: string;
  name: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [salonFilter, setSalonFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 50;

  useEffect(() => {
    fetchInventory();
  }, [page, salonFilter, lowStockFilter]);

  useEffect(() => {
    fetchSalons();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
      });
      if (search) params.set('search', search);
      if (salonFilter) params.set('salonId', salonFilter);
      if (lowStockFilter) params.set('lowStock', 'true');

      const res = await fetch(`/api/admin/inventory?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setTotal(data.total);
        setStats(data.stats);
        setMovements(data.recentMovements);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalons = async () => {
    try {
      const res = await fetch('/api/admin/salons');
      if (res.ok) {
        const data = await res.json();
        setSalons(data);
      }
    } catch (error) {
      console.error('Error fetching salons:', error);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchInventory();
  };

  const totalPages = Math.ceil(total / perPage);

  const movementTypeLabel: Record<string, { label: string; color: string }> = {
    IN: { label: 'Прихід', color: 'text-green-400' },
    OUT: { label: 'Продаж', color: 'text-red-400' },
    ADJUSTMENT: { label: 'Коригування', color: 'text-blue-400' },
    WRITE_OFF: { label: 'Списання', color: 'text-orange-400' },
    SERVICE: { label: 'На послугу', color: 'text-purple-400' },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Склад</h1>
          <p className="text-gray-400 text-sm">Товари всіх салонів</p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchInventory}
          className="bg-transparent border-white/10 text-white hover:bg-white/5"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Оновити
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <Card className="bg-[#12121a] border-white/5 p-4">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-violet-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalProducts}</p>
                <p className="text-sm text-gray-500">Товарів</p>
              </div>
            </div>
          </Card>

          <Card 
            className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${lowStockFilter ? 'border-orange-500' : ''}`}
            onClick={() => { setLowStockFilter(!lowStockFilter); setPage(1); }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-5 h-5 ${stats.lowStockCount > 0 ? 'text-orange-400' : 'text-gray-500'}`} />
              <div>
                <p className={`text-2xl font-bold ${stats.lowStockCount > 0 ? 'text-orange-400' : 'text-white'}`}>
                  {stats.lowStockCount}
                </p>
                <p className="text-sm text-gray-500">Закінчується</p>
              </div>
            </div>
          </Card>

          <Card className="bg-[#12121a] border-white/5 p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalCostValue.toLocaleString()} ₴</p>
                <p className="text-sm text-gray-500">Собівартість</p>
              </div>
            </div>
          </Card>

          <Card className="bg-[#12121a] border-white/5 p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalSellValue.toLocaleString()} ₴</p>
                <p className="text-sm text-gray-500">Вартість продажу</p>
              </div>
            </div>
          </Card>

          <Card className="bg-[#12121a] border-white/5 p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-2xl font-bold text-emerald-400">+{stats.potentialProfit.toLocaleString()} ₴</p>
                <p className="text-sm text-gray-500">Потенційний прибуток</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Products list */}
        <div className="col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Пошук по назві, артикулу..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9 bg-[#12121a] border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <select
              value={salonFilter}
              onChange={(e) => { setSalonFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-[#12121a] border border-white/10 rounded-lg text-white text-sm"
            >
              <option value="">Всі салони</option>
              {salons.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <Card className="bg-[#12121a] border-white/5 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Завантаження...</div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Товарів не знайдено</p>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Товар</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Салон</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Залишок</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ціна</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {products.map((product) => {
                      const isLowStock = product.quantity <= product.minQuantity;
                      return (
                        <tr key={product.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isLowStock ? 'bg-orange-500/20' : 'bg-violet-500/20'
                              }`}>
                                <Package className={`w-5 h-5 ${isLowStock ? 'text-orange-400' : 'text-violet-400'}`} />
                              </div>
                              <div>
                                <p className="text-white font-medium">{product.name}</p>
                                {product.sku && (
                                  <p className="text-xs text-gray-500">{product.sku}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-gray-400">
                              <Store className="w-4 h-4" />
                              <span className="text-sm">{product.salon.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${isLowStock ? 'text-orange-400' : 'text-white'}`}>
                                {product.quantity} {product.unit}
                              </span>
                              {isLowStock && (
                                <AlertTriangle className="w-4 h-4 text-orange-400" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500">мін. {product.minQuantity}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-white">{product.sellPrice} ₴</p>
                            <p className="text-xs text-gray-500">собів. {product.costPrice} ₴</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-white/5">
                    <p className="text-sm text-gray-500">
                      {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} з {total}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="bg-transparent border-white/10 text-white"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-gray-400">{page} / {totalPages}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages}
                        className="bg-transparent border-white/10 text-white"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        {/* Recent movements */}
        <Card className="bg-[#12121a] border-white/5 p-5 h-fit">
          <h3 className="font-semibold text-white mb-4">Останні рухи</h3>
          <div className="space-y-3">
            {movements.length === 0 ? (
              <p className="text-gray-500 text-sm">Немає рухів</p>
            ) : (
              movements.map((m) => {
                const config = movementTypeLabel[m.type] || { label: m.type, color: 'text-gray-400' };
                return (
                  <div key={m.id} className="flex items-center gap-3 text-sm">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${
                      m.quantity > 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {m.quantity > 0 ? (
                        <ArrowUp className="w-3 h-3 text-green-400" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate">{m.product.name}</p>
                      <p className={`text-xs ${config.color}`}>{config.label}</p>
                    </div>
                    <span className={`font-medium ${m.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
