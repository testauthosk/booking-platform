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
  masterColor?: string;
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

export function EventModal({ event, isOpen, masterColor, onClose, onEdit, onDelete, onExtend, onOpenClient, onOpenMaster, onChangeMaster, onChangeClient, isEditOpen }: EventModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Swipe down to close — тільки вниз, без expand
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const deltaY = useRef(0);
  const isDragging = useRef(false);
  const rafId = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Анімація відкриття/закриття
  useEffect(() => {
    if (isOpen && event) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
    } else {
      setIsAnimating(false);
      setShowDeleteConfirm(false);
      setIsDeleting(false);
      const timer = setTimeout(() => setIsVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, event]);

  // Тільки свайп вниз — translate3d only
  useEffect(() => {
    const handle = handleRef.current;
    const sheet = sheetRef.current;
    if (!handle || !sheet) return;

    const applyFrame = () => {
      if (!isDragging.current) return;
      const d = Math.max(0, deltaY.current);
      sheet.style.transform = `translate3d(0,${d}px,0)`;
      rafId.current = requestAnimationFrame(applyFrame);
    };

    const onStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      deltaY.current = 0;
      isDragging.current = true;
      sheet.style.transition = 'none';
      rafId.current = requestAnimationFrame(applyFrame);
    };

    const onMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      deltaY.current = e.touches[0].clientY - touchStartY.current;
    };

    const onEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      cancelAnimationFrame(rafId.current);

      sheet.style.transition = 'transform 600ms cubic-bezier(0.2,0,0,1)';
      if (deltaY.current > 80) {
        sheet.style.transform = `translate3d(0,${window.innerHeight}px,0)`;
        setTimeout(() => onCloseRef.current(), 600);
      } else {
        sheet.style.transform = 'translate3d(0,0,0)';
      }
    };

    handle.addEventListener('touchstart', onStart, { passive: true });
    handle.addEventListener('touchmove', onMove, { passive: true });
    handle.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      handle.removeEventListener('touchstart', onStart);
      handle.removeEventListener('touchmove', onMove);
      handle.removeEventListener('touchend', onEnd);
      cancelAnimationFrame(rafId.current);
    };
  }, [isVisible]);

  if (!isVisible || !event) return null;

  const isPast = event.start < new Date(); // Can't edit if session started or ended

  // Format phone: +380671000005 → +380 67 100 00 05
  const formatPhone = (phone?: string) => {
    if (!phone) return '';
    const digits = phone.replace(/[^0-9+]/g, '');
    if (digits.startsWith('+380') && digits.length === 13) {
      return `+380 ${digits.slice(4, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 11)} ${digits.slice(11)}`;
    }
    return phone;
  };

  // Capitalize first letter
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-black/80 z-[100]"
        style={{
          opacity: isAnimating ? 1 : 0,
          transition: 'opacity 500ms ease-out',
        }}
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div 
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 bg-background shadow-xl z-[110] overflow-hidden flex flex-col rounded-t-3xl"
        style={{
          maxHeight: '85vh',
          transform: isAnimating ? 'translate3d(0,0,0)' : 'translate3d(0,100%,0)',
          transition: 'transform 600ms cubic-bezier(0.2, 0, 0, 1)',
          willChange: 'transform',
        }}
      >
        {/* Colored header — swipe zone (native listeners via ref) */}
        <div
          ref={handleRef}
          className="px-4 pb-3 pt-2 relative shrink-0 rounded-t-3xl"
          style={{ backgroundColor: event.backgroundColor || '#8b5cf6', touchAction: 'none' }}
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

        {/* Content — scrollable */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {/* Client — main block */}
            {event.clientName && (
              <div className="rounded-2xl border border-border/50 overflow-hidden">
                <button
                  className="flex items-center gap-3 w-full text-left p-3 active:bg-muted/40 transition-colors"
                  onClick={() => onOpenClient?.(event.clientId || '', event.clientPhone)}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-primary">{event.clientName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base truncate">{event.clientName}</p>
                    {event.clientPhone && (
                      <p className="text-xs text-muted-foreground mt-0.5">{formatPhone(event.clientPhone)}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
                {/* Contact buttons row */}
                {event.clientPhone && (
                  <div className="flex border-t border-border/50">
                    <a
                      href={`tel:${event.clientPhone}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 transition-colors text-sm font-medium border-r border-border/50"
                    >
                      <Phone className="h-4 w-4" />
                      <span>Дзвінок</span>
                    </a>
                    <a
                      href={`https://t.me/${event.clientPhone?.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sky-500 hover:bg-sky-50 active:bg-sky-100 transition-colors text-sm font-medium border-r border-border/50"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm.056 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2zm4.93 5.83-1.48 6.99c-.11.5-.41.62-.83.39l-2.3-1.7-1.11 1.07c-.12.12-.23.23-.47.23l.17-2.35 4.26-3.85c.19-.17-.04-.26-.29-.1L8.59 12.6l-2.27-.71c-.49-.16-.5-.5.1-.73l8.88-3.42c.41-.15.77.1.64.73z"/></svg>
                      <span>Telegram</span>
                    </a>
                    <a
                      href={`https://wa.me/${event.clientPhone?.replace(/[^0-9+]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-green-600 hover:bg-green-50 active:bg-green-100 transition-colors text-sm font-medium"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.625-1.466A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-2.169 0-4.18-.591-5.914-1.621l-.424-.252-4.398 1.395 1.416-4.297-.277-.44A9.8 9.8 0 012.182 12c0-5.422 4.396-9.818 9.818-9.818S21.818 6.578 21.818 12s-4.396 9.818-9.818 9.818z"/></svg>
                      <span>WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Details grid — compact */}
            <div className="rounded-2xl border border-border/50 divide-y divide-border/50 overflow-hidden">
              {/* Status + Date row */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm flex-1">
                  {capitalize(format(event.start, "EEEE, d MMMM", { locale: uk }))}
                </p>
                {event.status && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[event.status] || 'bg-gray-100 text-gray-700'}`}>
                    {statusLabels[event.status] || event.status}
                  </span>
                )}
              </div>

              {/* Service row */}
              {event.serviceName && (
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <Scissors className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium">{event.serviceName}</p>
                </div>
              )}
            </div>

            {/* Master — separate block, lower */}
            {event.masterName && (
              <button
                className="flex items-center gap-3 w-full text-left rounded-2xl p-3 bg-muted/30 border border-border/50 active:bg-muted/60 transition-colors"
                onClick={() => event.resourceId && onOpenMaster?.(event.resourceId)}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: masterColor || event.backgroundColor || '#8b5cf6' }}
                >
                  <span className="text-white text-sm font-bold">{event.masterName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground">Майстер</p>
                  <p className="font-medium text-sm truncate">{event.masterName}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            )}
          </div>

        {/* Delete Confirmation — animated */}
        <div
          className="overflow-hidden border-t border-red-200 transition-all duration-300 ease-out"
          style={{
            maxHeight: showDeleteConfirm ? '150px' : '0px',
            opacity: showDeleteConfirm ? 1 : 0,
          }}
        >
          <div className="px-4 py-3 bg-red-50">
            <p className="text-sm font-medium text-red-700 mb-2">
              Видалити запис {event.clientName}?
            </p>
            <p className="text-xs text-red-600 mb-3">
              {event.serviceName} · {format(event.start, "d MMMM 'о' HH:mm", { locale: uk })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-9 text-sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Скасувати
              </Button>
              <Button
                className="flex-1 h-9 text-sm bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDelete?.(event);
                  } catch {}
                  setIsDeleting(false);
                }}
              >
                {isDeleting ? 'Видалення...' : 'Так, видалити'}
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        {!showDeleteConfirm && (
          <div className="p-4 border-t flex gap-2 pb-8 shrink-0">
            <Button
              variant="outline"
              className={`flex-1 h-11 relative overflow-hidden ${isPast ? 'cursor-not-allowed' : ''}`}
              onClick={() => !isPast && onEdit?.(event)}
              disabled={isPast}
            >
              <Edit className="h-4 w-4 mr-2" />
              Редагувати
              {isPast && (
                <div
                  className="absolute inset-0 pointer-events-none rounded-md"
                  style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, ${masterColor || 'rgba(0,0,0,0.08)'}30 4px, ${masterColor || 'rgba(0,0,0,0.08)'}30 8px)`,
                  }}
                />
              )}
            </Button>
            <Button
              variant="outline"
              className="h-11 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
