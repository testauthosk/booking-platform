// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePreservedModal } from '@/hooks/use-preserved-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  price: number;
  priceFrom: boolean;
  duration: number;
}

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Service>) => Promise<void>;
  onAddCategory?: () => void;
  service?: Service | null;
  categories: Category[];
}

export function ServiceModal({
  isOpen,
  onClose,
  onSave,
  onAddCategory,
  service,
  categories,
}: ServiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [price, setPrice] = useState('');
  const [priceFrom, setPriceFrom] = useState(false);
  const [duration, setDuration] = useState('30');

  const isEdit = !!service;

  const resetState = useCallback(() => {
    setName('');
    setDescription('');
    setCategoryId('');
    setPrice('');
    setPriceFrom(false);
    setDuration('30');
  }, []);

  // Зберігати стан 3 хв після закриття
  usePreservedModal(isOpen, resetState);

  useEffect(() => {
    if (service) {
      setName(service.name);
      setDescription(service.description || '');
      setCategoryId(service.categoryId || '');
      setPrice(service.price.toString());
      setPriceFrom(service.priceFrom);
      setDuration(service.duration.toString());
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId: categoryId || undefined,
        price: parseInt(price),
        priceFrom,
        duration: parseInt(duration),
      });
      onClose();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Редагувати послугу' : 'Додати послугу'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Назва *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Стрижка"
              required
              autoFocus={false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Категорія</Label>
            <div className="flex gap-2">
              <Select value={categoryId || 'none'} onValueChange={(val) => setCategoryId(val === 'none' ? '' : val)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Без категорії" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без категорії</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {onAddCategory && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onAddCategory}
                  title="Додати категорію"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Опис</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Короткий опис послуги..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Ціна (₴) *</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="500"
                min="0"
                required
                className="h-[42px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Тривалість (хв)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-[42px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 хв</SelectItem>
                  <SelectItem value="30">30 хв</SelectItem>
                  <SelectItem value="45">45 хв</SelectItem>
                  <SelectItem value="60">1 год</SelectItem>
                  <SelectItem value="90">1 год 30 хв</SelectItem>
                  <SelectItem value="120">2 год</SelectItem>
                  <SelectItem value="150">2 год 30 хв</SelectItem>
                  <SelectItem value="180">3 год</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="priceFrom" className="cursor-pointer text-sm">
              Ціна "від"
            </Label>
            <Switch
              id="priceFrom"
              checked={priceFrom}
              onCheckedChange={setPriceFrom}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Скасувати
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Зберегти' : 'Додати'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
