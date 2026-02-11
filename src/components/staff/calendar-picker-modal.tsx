'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { staffFetch } from '@/lib/staff-fetch';
import { ChevronLeft, Loader2, Phone } from 'lucide-react';

interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  serviceId?: string;
  time: string;
  timeEnd?: string;
  duration: number;
  status: string;
  price?: number;
}

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  type: string;
}

function getColorVariants(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const bgR = Math.round(r + (255 - r) * 0.85);
  const bgG = Math.round(g + (255 - g) * 0.85);
  const bgB = Math.round(b + (255 - b) * 0.85);
  const darkR = Math.round(r * 0.65);
  const darkG = Math.round(g * 0.65);
  const darkB = Math.round(b * 0.65);
  return {
    bg: `rgb(${bgR}, ${bgG}, ${bgB})`,
    stripe: `rgb(${darkR}, ${darkG}, ${darkB})`,
  };
}

interface CalendarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDateSelect: (date: Date) => void;
  staffId: string;
  salonId: string;
  masterColor: string;
  /** Optional callback when a client is tapped (name + phone). */
  onClientTap?: (name: string, phone: string) => void;
}

export function CalendarPickerModal({
  isOpen,
  onClose,
  onDateSelect,
  staffId,
  salonId,
  masterColor,
  onClientTap,
}: CalendarPickerModalProps) {
  const [pickerViewDate, setPickerViewDate] = useState(new Date());
  const [pickerBookings, setPickerBookings] = useState<Booking[]>([]);
  const [pickerTimeBlocks, setPickerTimeBlocks] = useState<TimeBlock[]>([]);
  const [pickerBookingsLoading, setPickerBookingsLoading] = useState(false);
  const [calendarCollapsed, setCalendarCollapsed] = useState(false);
  const bookingsListRef = useRef<HTMLDivElement>(null);
  const lastCollapseToggle = useRef<number>(0);

  const loadPickerBookings = useCallback(async (date: Date) => {
    if (!staffId) return;
    setPickerBookingsLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const [dashRes, tbRes] = await Promise.all([
        staffFetch(`/api/staff/dashboard?masterId=${staffId}&date=${dateStr}`),
        staffFetch(`/api/staff/time-blocks?masterId=${staffId}&date=${dateStr}`),
      ]);
      if (dashRes.ok) {
        const data = await dashRes.json();
        setPickerBookings(data.todayBookings || []);
      }
      if (tbRes.ok) {
        const tbData = await tbRes.json();
        setPickerTimeBlocks(tbData);
      } else {
        setPickerTimeBlocks([]);
      }
    } catch (error) {
      console.error('Load picker bookings error:', error);
    } finally {
      setPickerBookingsLoading(false);
    }
  }, [staffId]);

  // Load bookings when modal opens
  useEffect(() => {
    if (isOpen && staffId) {
      loadPickerBookings(pickerViewDate);
    }
  }, [isOpen, staffId]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Reset collapse state when opening
  useEffect(() => {
    if (isOpen) {
      setCalendarCollapsed(false);
    }
  }, [isOpen]);

  const colors = getColorVariants(masterColor);

  return (
    <div
      className={`fixed inset-0 bg-background z-50 flex flex-col transition-transform duration-500 ease-out ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between shrink-0 bg-card">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="font-semibold text-lg">Архів записів</h2>
            <p className="text-sm text-muted-foreground">
              {pickerViewDate.toLocaleDateString('uk-UA', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setPickerViewDate(new Date());
            loadPickerBookings(new Date());
          }}
          className="h-10 w-[100px] rounded-xl text-sm font-medium border border-zinc-200 bg-white transition-colors duration-300 flex items-center justify-center gap-1 relative"
        >
          <span className={`transition-all duration-300 ease-out absolute left-2.5 ${pickerViewDate.toDateString() === new Date().toDateString() ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>✓</span>
          <span className={`transition-transform duration-300 ease-out ${pickerViewDate.toDateString() === new Date().toDateString() ? 'translate-x-2' : 'translate-x-0'}`}>Сьогодні</span>
        </button>
      </div>

      {/* Calendar – collapsible */}
      <div
        className={`bg-card border-b shrink-0 overflow-hidden z-10 relative shadow-sm ${
          calendarCollapsed ? 'max-h-[60px]' : 'max-h-[400px]'
        }`}
        style={{
          transition: 'max-height 560ms cubic-bezier(0.32, 0.72, 0, 1), box-shadow 300ms ease-out',
          boxShadow: calendarCollapsed ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
        }}
        onClick={() => calendarCollapsed && setCalendarCollapsed(false)}
      >
        <div className="p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newDate = new Date(pickerViewDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setPickerViewDate(newDate);
              }}
              className="h-9 w-9 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center"
              style={{
                opacity: calendarCollapsed ? 0 : 1,
                transition: 'opacity 400ms ease-out',
                pointerEvents: calendarCollapsed ? 'none' : 'auto',
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="font-semibold capitalize" style={{ transition: 'opacity 300ms ease-out' }}>
                {pickerViewDate.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })}
              </p>
              <p
                className="text-xs text-muted-foreground"
                style={{
                  opacity: calendarCollapsed ? 1 : 0,
                  maxHeight: calendarCollapsed ? '20px' : '0px',
                  transition: 'opacity 300ms ease-out, max-height 300ms ease-out',
                  overflow: 'hidden',
                }}
              >
                Натисніть щоб розгорнути
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newDate = new Date(pickerViewDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setPickerViewDate(newDate);
              }}
              className="h-9 w-9 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center"
              style={{
                opacity: calendarCollapsed ? 0 : 1,
                transition: 'opacity 400ms ease-out',
                pointerEvents: calendarCollapsed ? 'none' : 'auto',
              }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Days of week */}
          <div
            className="grid grid-cols-7 gap-1 mb-1"
            style={{
              opacity: calendarCollapsed ? 0 : 1,
              transition: 'opacity 300ms ease-out',
            }}
          >
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div
            className="grid grid-cols-7 gap-1"
            style={{
              opacity: calendarCollapsed ? 0 : 1,
              transition: 'opacity 300ms ease-out',
            }}
          >
            {(() => {
              const year = pickerViewDate.getFullYear();
              const month = pickerViewDate.getMonth();
              const firstDay = new Date(year, month, 1);
              const lastDay = new Date(year, month + 1, 0);
              const startPadding = (firstDay.getDay() + 6) % 7;
              const daysInMonth = lastDay.getDate();
              const today = new Date();

              const cells = [];

              for (let i = 0; i < startPadding; i++) {
                cells.push(<div key={`pad-${i}`} className="h-9" />);
              }

              for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const isTodayDate = date.toDateString() === today.toDateString();
                const isSelectedDate = date.toDateString() === pickerViewDate.toDateString();

                cells.push(
                  <button
                    key={day}
                    onClick={() => {
                      setPickerViewDate(date);
                      loadPickerBookings(date);
                    }}
                    className={`h-9 w-full rounded-lg text-sm font-medium transition-all ${
                      isSelectedDate
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : isTodayDate
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {day}
                  </button>,
                );
              }

              return cells;
            })()}
          </div>
        </div>
      </div>

      {/* Bookings list */}
      <div
        ref={bookingsListRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          const now = Date.now();
          if (now - lastCollapseToggle.current < 300) return;

          if (target.scrollTop > 60 && !calendarCollapsed) {
            setCalendarCollapsed(true);
            lastCollapseToggle.current = now;
          } else if (target.scrollTop < 5 && calendarCollapsed) {
            setCalendarCollapsed(false);
            lastCollapseToggle.current = now;
            target.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
      >
        {pickerBookingsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pickerBookings.length > 0 || pickerTimeBlocks.length > 0 ? (
          <>
            {pickerTimeBlocks.map((block) => (
              <div
                key={`tb-${block.id}`}
                className="rounded-xl overflow-hidden bg-zinc-100"
                style={{ borderLeft: '4px solid #a1a1aa' }}
              >
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold">{block.startTime}</span>
                    <span className="text-sm text-muted-foreground">—</span>
                    <span className="text-sm text-muted-foreground">{block.endTime}</span>
                  </div>
                  <p className="font-semibold">🚫 {block.title || 'Заблоковано'}</p>
                  <p className="text-sm text-muted-foreground">
                    {block.type === 'LUNCH'
                      ? 'Обід'
                      : block.type === 'BREAK'
                      ? 'Перерва'
                      : block.type === 'DAY_OFF'
                      ? 'Вихідний'
                      : block.type === 'VACATION'
                      ? 'Відпустка'
                      : 'Блокування'}
                  </p>
                </div>
              </div>
            ))}
            {pickerBookings.map((booking) => {
              const [h, m] = booking.time.split(':').map(Number);
              const endMins = h * 60 + m + booking.duration;
              const endH = Math.floor(endMins / 60);
              const endM = endMins % 60;
              const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
              const bColors = getColorVariants(masterColor);
              const isBlocked = booking.clientName === 'Зайнято';

              return (
                <div
                  key={booking.id}
                  className={`rounded-xl overflow-hidden ${
                    booking.status === 'COMPLETED' ? 'bg-green-50' : isBlocked ? 'bg-zinc-100' : ''
                  }`}
                  style={{
                    backgroundColor:
                      booking.status === 'COMPLETED' ? undefined : isBlocked ? undefined : bColors.bg,
                    borderLeft: `4px solid ${bColors.stripe}`,
                  }}
                >
                  <div className="p-3 flex justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold">{booking.time}</span>
                        <span className="text-sm text-muted-foreground">—</span>
                        <span className="text-sm text-muted-foreground">{endTime}</span>
                      </div>

                      <button
                        onClick={() => {
                          if (!isBlocked && booking.clientPhone && onClientTap) {
                            onClientTap(booking.clientName, booking.clientPhone);
                          }
                        }}
                        className={`font-semibold truncate text-left ${
                          !isBlocked ? 'hover:text-primary hover:underline' : ''
                        }`}
                      >
                        {booking.clientName}
                      </button>
                      <p className="text-sm text-muted-foreground truncate">{booking.serviceName}</p>

                      {!isBlocked && (
                        <div className="flex items-baseline gap-3 mt-1">
                          <span className="text-sm text-muted-foreground">{booking.duration} хв</span>
                          {booking.price !== undefined && booking.price > 0 && (
                            <span className="text-base font-bold">{booking.price} ₴</span>
                          )}
                        </div>
                      )}

                      {booking.status === 'COMPLETED' && (
                        <span className="inline-block mt-2 text-xs bg-green-200 text-green-700 px-2 py-0.5 rounded">
                          ✓ Завершено
                        </span>
                      )}
                    </div>

                    {/* Call button */}
                    {!isBlocked && booking.clientPhone && (
                      <div className="shrink-0">
                        <a
                          href={`tel:${booking.clientPhone}`}
                          className="h-9 px-3 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1 shadow-sm whitespace-nowrap"
                        >
                          <Phone className="h-3.5 w-3.5" /> Зателефонувати
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Немає записів на цей день</p>
          </div>
        )}
      </div>
    </div>
  );
}
