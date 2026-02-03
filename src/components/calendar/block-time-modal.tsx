'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  X, Coffee, UtensilsCrossed, Palmtree, Ban, Clock, 
  Calendar, User, Repeat, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePreservedModal } from '@/hooks/use-preserved-modal';

interface BlockTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  time: string;
  masterId?: string;
  masterName?: string;
  salonId: string;
  onSave: () => void;
}

const blockTypes = [
  { id: 'BREAK', label: 'Перерва', icon: Coffee, color: 'bg-slate-500', emoji: '☕' },
  { id: 'LUNCH', label: 'Обід', icon: UtensilsCrossed, color: 'bg-amber-500', emoji: '🍽️' },
  { id: 'DAY_OFF', label: 'Вихідний', icon: Ban, color: 'bg-red-500', emoji: '🚫' },
  { id: 'VACATION', label: 'Відпустка', icon: Palmtree, color: 'bg-green-500', emoji: '🏖️' },
  { id: 'OTHER', label: 'Інше', icon: Clock, color: 'bg-violet-500', emoji: '⏰' },
];

const quickDurations = [
  { label: '15 хв', minutes: 15 },
  { label: '30 хв', minutes: 30 },
  { label: '1 год', minutes: 60 },
  { label: '2 год', minutes: 120 },
  { label: 'До кінця дня', minutes: -1 },
];

export function BlockTimeModal({
  isOpen,
  onClose,
  date,
  time,
  masterId,
  masterName,
  salonId,
  onSave,
}: BlockTimeModalProps) {
  const [selectedType, setSelectedType] = useState('BREAK');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(time);
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetState = useCallback(() => {
    setSelectedType('BREAK');
    setTitle('');
    setIsAllDay(false);
  }, []);

  // Зберігати стан 3 хв після закриття
  usePreservedModal(isOpen, resetState);

  useEffect(() => {
    if (isOpen) {
      setStartTime(time);
      // За замовчуванням +30 хв
      const [h, m] = time.split(':').map(Number);
      const endMinutes = h * 60 + m + 30;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      setEndTime(`${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`);
      setSelectedType('BREAK');
      setTitle('');
      setIsAllDay(false);
    }
  }, [isOpen, time]);

  const handleQuickDuration = (minutes: number) => {
    if (minutes === -1) {
      // До кінця дня
      setEndTime('20:00');
      return;
    }
    const [h, m] = startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + minutes;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    setEndTime(`${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/time-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          masterId: masterId || null,
          date: date.toISOString().split('T')[0],
          startTime: isAllDay ? '00:00' : startTime,
          endTime: isAllDay ? '23:59' : endTime,
          title: title || blockTypes.find(t => t.id === selectedType)?.label,
          type: selectedType,
          isAllDay,
        }),
      });

      if (res.ok) {
        onSave();
        onClose();
      }
    } catch (error) {
      console.error('Error creating time block:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('uk-UA', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const selectedTypeData = blockTypes.find(t => t.id === selectedType);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className={cn(
          "fixed inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "w-full sm:w-[420px] sm:max-h-[85vh]",
          "bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl z-50",
          "transform transition-all duration-300 ease-out",
          isOpen ? "translate-y-0 sm:scale-100 opacity-100" : "translate-y-full sm:scale-95 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="relative p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center text-white text-lg",
              selectedTypeData?.color || 'bg-slate-500'
            )}>
              {selectedTypeData?.emoji}
            </div>
            <div>
              <h2 className="font-semibold">Заблокувати час</h2>
              <p className="text-sm text-muted-foreground">
                {formatDate(date)} {masterName && `• ${masterName}`}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Block type selection */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Тип</Label>
            <div className="grid grid-cols-5 gap-2">
              {blockTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all",
                    selectedType === type.id 
                      ? "border-primary bg-primary/5" 
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  )}
                >
                  <span className="text-xl">{type.emoji}</span>
                  <span className="text-[10px] font-medium truncate w-full text-center">
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom title */}
          <div>
            <Label htmlFor="title" className="text-xs text-muted-foreground">
              Назва (необов'язково)
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={selectedTypeData?.label}
              className="mt-1"
            />
          </div>

          {/* All day toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Весь день</span>
            </div>
            <button
              onClick={() => setIsAllDay(!isAllDay)}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative",
                isAllDay ? "bg-primary" : "bg-muted"
              )}
            >
              <div className={cn(
                "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform",
                isAllDay ? "translate-x-6" : "translate-x-1"
              )} />
            </button>
          </div>

          {/* Time selection */}
          {!isAllDay && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startTime" className="text-xs text-muted-foreground">
                    Початок
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endTime" className="text-xs text-muted-foreground">
                    Кінець
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Quick duration buttons */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Швидкий вибір</Label>
                <div className="flex flex-wrap gap-2">
                  {quickDurations.map((d) => (
                    <button
                      key={d.label}
                      onClick={() => handleQuickDuration(d.minutes)}
                      className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Скасувати
          </Button>
          <Button 
            className="flex-1 gap-2" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Заблокувати
          </Button>
        </div>
      </div>
    </>
  );
}
