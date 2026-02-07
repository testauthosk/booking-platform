'use client';

import { useState, useEffect } from 'react';
import { BookingEvent } from './booking-calendar';
import { Button } from '@/components/ui/button';
import { X, Clock, User, Phone, Scissors, Calendar, Edit, Trash2, Timer, MessageCircle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

interface EventModalProps {
  event: BookingEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (event: BookingEvent) => void;
  onDelete?: (event: BookingEvent) => void;
  onExtend?: (event: BookingEvent, minutes: number) => void;
  onOpenClient?: (clientId: string) => void;
  onOpenMaster?: (masterId: string) => void;
}

export function EventModal({ event, isOpen, onClose, onEdit, onDelete, onExtend, onOpenClient, onOpenMaster }: EventModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => setIsAnimating(true));
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`fixed inset-x-4 bottom-24 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md bg-background rounded-2xl shadow-xl z-50 transition-all duration-300 ${
        isAnimating 
          ? 'opacity-100 translate-y-0 lg:scale-100' 
          : 'opacity-0 translate-y-8 lg:translate-y-0 lg:scale-95'
      }`}>
        {/* Header */}
        <div 
          className="p-4 rounded-t-2xl relative"
          style={{ backgroundColor: event.backgroundColor || '#8b5cf6' }}
        >
          <div className="pr-10">
            <h2 className="text-lg font-semibold text-white">{event.title}</h2>
            <p className="text-white/80 text-sm mt-1">
              {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
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
            {/* Клієнт — кликабельний */}
            {event.clientName && (
              <button
                className="flex items-center gap-3 w-full text-left rounded-xl p-2 -mx-2 hover:bg-muted/50 transition-colors group"
                onClick={() => event.clientId && onOpenClient?.(event.clientId)}
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Клієнт</p>
                  <p className="font-medium truncate">{event.clientName}</p>
                </div>
                {event.clientId && onOpenClient && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </button>
            )}

            {/* Швидкі кнопки зв'язку */}
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

            {/* Майстер — кликабельний */}
            {event.masterName && (
              <button
                className="flex items-center gap-3 w-full text-left rounded-xl p-2 -mx-2 hover:bg-muted/50 transition-colors group"
                onClick={() => event.resourceId && onOpenMaster?.(event.resourceId)}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: event.backgroundColor || '#8b5cf6' }}
                >
                  <span className="text-white text-sm font-bold">{event.masterName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Майстер</p>
                  <p className="font-medium truncate">{event.masterName}</p>
                </div>
                {event.resourceId && onOpenMaster && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </button>
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

        {/* Quick extend buttons */}
        {onExtend && event.status !== 'cancelled' && (
          <div className="px-4 py-2 border-t flex gap-2">
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
        <div className="p-4 border-t flex gap-2 pb-6 lg:pb-4">
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
      </div>
    </>
  );
}
