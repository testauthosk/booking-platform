'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePreservedModal } from '@/hooks/use-preserved-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

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
  categoryId?: string | null;
  category: Category | null;
}

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSave: () => void;
}

export function ProductModal({ open, onClose, product, onSave }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    sku: '',
    costPrice: 0,
    sellPrice: 0,
    quantity: 0,
    minQuantity: 5,
    unit: 'шт',
    categoryId: '',
  });

  const resetState = useCallback(() => {
    setForm({
      name: '',
      description: '',
      sku: '',
      costPrice: 0,
      sellPrice: 0,
      quantity: 0,
      minQuantity: 5,
      unit: 'шт',
      categoryId: '',
    });
  }, []);

  // Зберігати стан 3 хв після закриття
  usePreservedModal(open, resetState);

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (product) {
        setForm({
          name: product.name,
          description: product.description || '',
          sku: product.sku || '',
          costPrice: product.costPrice,
          sellPrice: product.sellPrice,
          quantity: product.quantity,
          minQuantity: product.minQuantity,
          unit: product.unit,
          categoryId: product.category?.id || '',
        });
      } else {
        setForm({
          name: '',
          description: '',
          sku: '',
          costPrice: 0,
          sellPrice: 0,
          quantity: 0,
          minQuantity: 5,
          unit: 'шт',
          categoryId: '',
        });
      }
    }
  }, [open, product]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/inventory/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = product 
        ? `/api/inventory/products/${product.id}`
        : '/api/inventory/products';
      
      const res = await fetch(url, {
        method: product ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          categoryId: form.categoryId || null,
        }),
      });

      if (res.ok) {
        onSave();
      } else {
        const error = await res.json();
        alert(error.error || 'Помилка збереження');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Помилка збереження');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Редагувати товар' : 'Новий товар'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Назва *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Шампунь American Crew"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Категорія</Label>
            <Select 
              value={form.categoryId} 
              onValueChange={(v) => setForm({ ...form, categoryId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Оберіть категорію" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Без категорії</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">Артикул (SKU)</Label>
            <Input
              id="sku"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="AC-SHMP-001"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="costPrice">Закупівельна ціна</Label>
              <Input
                id="costPrice"
                type="number"
                min="0"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellPrice">Ціна продажу</Label>
              <Input
                id="sellPrice"
                type="number"
                min="0"
                value={form.sellPrice}
                onChange={(e) => setForm({ ...form, sellPrice: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {!product && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">Початковий залишок</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Одиниця</Label>
                <Select 
                  value={form.unit} 
                  onValueChange={(v) => setForm({ ...form, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="шт">шт</SelectItem>
                    <SelectItem value="мл">мл</SelectItem>
                    <SelectItem value="л">л</SelectItem>
                    <SelectItem value="г">г</SelectItem>
                    <SelectItem value="кг">кг</SelectItem>
                    <SelectItem value="уп">уп</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="minQuantity">Мін. залишок (для сповіщень)</Label>
            <Input
              id="minQuantity"
              type="number"
              min="0"
              value={form.minQuantity}
              onChange={(e) => setForm({ ...form, minQuantity: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Опис</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Опис товару..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Скасувати
            </Button>
            <Button type="submit" disabled={loading || !form.name} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {product ? 'Зберегти' : 'Додати'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
