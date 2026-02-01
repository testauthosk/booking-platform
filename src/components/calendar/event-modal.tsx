'use client';

import { BookingEvent } from './booking-calendar';
import './calendar-styles.css';
import { Button } from '@/components/ui/button';
import { X, Clock, User, Phone, Scissors, Calendar, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

interface EventModalProps {
  event: BookingEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (event: BookingEvent) => void;
  onDelete?: (event: BookingEvent) => void;
}

export function EventModal({ event, isOpen, onClose, onEdit, onDelete }: EventModalProps) {
  if (!isOpen || !event) return null;

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
        className="fixed inset-0 bg-black/50 z-50 modal-backdrop"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-4 bottom-24 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md bg-background rounded-2xl shadow-xl z-50 modal-content">
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
            {event.clientName && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Клієнт</p>
                  <p className="font-medium">{event.clientName}</p>
                </div>
              </div>
            )}

            {event.clientPhone && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Телефон</p>
                  <a href={`tel:${event.clientPhone}`} className="font-medium text-primary">
                    {event.clientPhone}
                  </a>
                </div>
              </div>
            )}

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

            {event.masterName && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Майстер</p>
                  <p className="font-medium">{event.masterName}</p>
                </div>
              </div>
            )}

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
