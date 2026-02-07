'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BookingEvent } from './booking-calendar';
import { Button } from '@/components/ui/button';
import { X, Clock, User, Phone, Scissors, Edit, Trash2, MessageCircle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

interface EventModalProps {
  event: BookingEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (event: BookingEvent) => void;
  onDelete?: (event: BookingEvent) => void;
  onExtend?: (event: BookingEvent, minutes: number) => void;
  onOpenClient?: (clientId: string, clientPhone?: string) => void;
  onOpenMaster?: (masterId: string) => void;
  onChangeMaster?: (bookingId: string, currentMasterId?: string) => void;
  onChangeClient?: (bookingId: string, currentClientId?: string) => void;
  isEditOpen?: boolean;
}

export function EventModal({ event, isOpen, onClose, onEdit, onDelete, onExtend, onOpenClient, onOpenMaster, onChangeMaster, onChangeClient, isEditOpen }: EventModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Swipe-to-dismiss
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const isDragging = useRef(false);

  // Анімація відкриття/закриття (копія з кабінету мастера)
  useEffect(() => {
    if (isOpen && event) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, event]);

  // Touch handlers — тільки на handle area
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    currentTranslateY.current = 0;
    isDragging.current = true;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    // Тільки вниз (delta > 0), з damping для тяги вгору
    const translateY = delta > 0 ? delta : delta * 0.2;
    currentTranslateY.current = translateY;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${Math.max(0, translateY)}px)`;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 500ms cubic-bezier(0.32, 0.72, 0, 1)';
    }
    if (currentTranslateY.current > 100) {
      // Свайп вниз — закрити
      onClose();
    } else {
      // Повернути на місце
      if (sheetRef.current) {
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }
  }, [onClose]);

  if (!isVisible || !event) return null;

  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const statusLabels: Record<string, string> = {
    confirmed: 'Підтверджено',
    pending: 'Очікує',
    cancelled: 'Скасовано',
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        style={{
          opacity: isAnimating ? 1 : 0,
          transition: 'opacity 400ms ease-out',
        }}
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div 
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 bg-background rounded-t-3xl shadow-xl z-[110] max-h-[85vh] overflow-hidden flex flex-col"
        style={{
          transform: isAnimating ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 500ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Colored header with swipe handle */}
        <div
          className="px-4 pb-3 pt-2 relative rounded-t-3xl shrink-0"
          style={{ backgroundColor: event.backgroundColor || '#8b5cf6' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Drag handle pill */}
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>
          <div className="pr-10">
            <p className="text-2xl font-bold text-white tracking-tight">
              {format(event.start, 'HH:mm')} – {format(event.end, 'HH:mm')}
            </p>
            <h2 className="text-sm font-medium text-white/80 mt-0.5">{event.title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-3 right-4 w-8 h-8 rounded-xl bg-white/80 hover:bg-white shadow-md border border-gray-200 text-gray-700 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content — scrollable (hidden when edit is open) */}
        {!isEditOpen && (
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {/* Status */}
            {event.status && (
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[event.status] || 'bg-gray-100 text-gray-700'}`}>
                  {statusLabels[event.status] || event.status}
                </span>
              </div>
            )}

            {/* Details */}
            <div className="space-y-3">
              {/* Клієнт */}
              {event.clientName && (
                <div className="flex items-center gap-2">
                  <button
                    className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl p-2 -ml-2 hover:bg-muted/50 transition-colors group"
                    onClick={() => onOpenClient?.(event.clientId || '', event.clientPhone)}
                  >
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-muted-foreground">Клієнт</p>
                      <p className="font-medium text-sm truncate">{event.clientName}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                  {onChangeClient && (
                    <button
                      className="text-xs text-primary font-medium px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors shrink-0"
                      onClick={() => onChangeClient(event.id, event.clientId)}
                    >
                      Змінити
                    </button>
                  )}
                </div>
              )}

              {/* Кнопки зв'язку */}
              {event.clientPhone && (
                <div className="flex items-center gap-2 pl-12">
                  <a
                    href={`tel:${event.clientPhone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-medium hover:bg-emerald-100 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Зателефонувати
                  </a>
                  <a
                    href={`https://t.me/${event.clientPhone?.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-50 text-sky-500 hover:bg-sky-100 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                  <a
                    href={`https://wa.me/${event.clientPhone?.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.625-1.466A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-2.169 0-4.18-.591-5.914-1.621l-.424-.252-4.398 1.395 1.416-4.297-.277-.44A9.8 9.8 0 012.182 12c0-5.422 4.396-9.818 9.818-9.818S21.818 6.578 21.818 12s-4.396 9.818-9.818 9.818z"/></svg>
                  </a>
                </div>
              )}

              {/* Послуга */}
              {event.serviceName && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                    <Scissors className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Послуга</p>
                    <p className="font-medium">{event.serviceName}</p>
                  </div>
                </div>
              )}

              {/* Майстер */}
              {event.masterName && (
                <div className="flex items-center gap-2">
                  <button
                    className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl p-2 -ml-2 hover:bg-muted/50 transition-colors group"
                    onClick={() => event.resourceId && onOpenMaster?.(event.resourceId)}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: event.backgroundColor || '#8b5cf6' }}
                    >
                      <span className="text-white text-sm font-bold">{event.masterName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-muted-foreground">Майстер</p>
                      <p className="font-medium text-sm truncate">{event.masterName}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                  {onChangeMaster && (
                    <button
                      className="text-xs text-primary font-medium px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors shrink-0"
                      onClick={() => onChangeMaster(event.id, event.resourceId)}
                    >
                      Змінити
                    </button>
                  )}
                </div>
              )}

              {/* Дата і час */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Дата і час</p>
                  <p className="font-medium">
                    {format(event.start, "EEEE, d MMMM 'о' HH:mm", { locale: uk })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick extend buttons */}
        {onExtend && event.status !== 'cancelled' && !isEditOpen && (
          <div className="px-4 py-2 border-t flex gap-2 shrink-0">
            <span className="text-sm text-muted-foreground self-center">Продовжити:</span>
            {[10, 15, 30].map((mins) => (
              <button
                key={mins}
                onClick={() => onExtend(event, mins)}
                className="px-3 py-1.5 rounded-lg bg-violet-100 text-violet-700 text-sm font-medium hover:bg-violet-200 transition-colors"
              >
                +{mins}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        {!isEditOpen && (
          <div className="p-4 border-t flex gap-2 pb-8 shrink-0">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => onEdit?.(event)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Редагувати
            </Button>
            <Button
              variant="outline"
              className="h-11 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onDelete?.(event)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
