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
import { Loader2, ArrowUpCircle, ArrowDownCircle, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  costPrice: number;
  sellPrice: number;
}

interface MovementModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  type: 'IN' | 'OUT';
  onSave: () => void;
}

export function MovementModal({ open, onClose, product, type, onSave }: MovementModalProps) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [costPrice, setCostPrice] = useState(0);

  const resetState = useCallback(() => {
    setQuantity(1);
    setNote('');
  }, []);

  // Зберігати стан 3 хв після закриття
  usePreservedModal(open, resetState);

  useEffect(() => {
    if (open && product) {
      setCostPrice(product.costPrice);
    }
  }, [open, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    
    setLoading(true);

    try {
      const res = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          type,
          quantity,
          costPrice: type === 'IN' ? costPrice : undefined,
          sellPrice: type === 'OUT' ? product.sellPrice : undefined,
          note,
        }),
      });

      if (res.ok) {
        onSave();
      } else {
        const error = await res.json();
        alert(error.error || 'Помилка');
      }
    } catch (error) {
      console.error('Error creating movement:', error);
      alert('Помилка');
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  const isIn = type === 'IN';
  const newQuantity = isIn ? product.quantity + quantity : product.quantity - quantity;
  const isValid = quantity > 0 && (isIn || quantity <= product.quantity);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isIn ? (
              <ArrowUpCircle className="h-5 w-5 text-green-500" />
            ) : (
              <ArrowDownCircle className="h-5 w-5 text-red-500" />
            )}
            {isIn ? 'Прихід товару' : 'Списання товару'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="h-10 w-10 rounded bg-background flex items-center justify-center">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-muted-foreground">
                Залишок: {product.quantity} {product.unit}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Кількість</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={isIn ? undefined : product.quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              required
            />
            {!isIn && quantity > product.quantity && (
              <p className="text-xs text-red-500">Недостатньо на складі</p>
            )}
          </div>

          {isIn && (
            <div className="space-y-2">
              <Label htmlFor="costPrice">Закупівельна ціна (за од.)</Label>
              <Input
                id="costPrice"
                type="number"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(parseInt(e.target.value) || 0)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="note">Примітка</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isIn ? 'Постачальник, накладна...' : 'Причина списання...'}
              rows={2}
            />
          </div>

          {/* Preview */}
          <div className="p-3 bg-muted rounded-lg text-sm">
            <div className="flex justify-between">
              <span>Було:</span>
              <span>{product.quantity} {product.unit}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Буде:</span>
              <span className={newQuantity < 0 ? 'text-red-500' : ''}>
                {newQuantity} {product.unit}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Скасувати
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !isValid} 
              className={`flex-1 ${isIn ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isIn ? 'Оприходувати' : 'Списати'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
