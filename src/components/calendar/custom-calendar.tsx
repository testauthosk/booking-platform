'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

// Функция затемнения цвета
function darkenColor(hex: string, amount: number = 0.3): string {
  const color = hex.replace('#', '');
  const r = Math.max(0, parseInt(color.substring(0, 2), 16) * (1 - amount));
  const g = Math.max(0, parseInt(color.substring(2, 4), 16) * (1 - amount));
  const b = Math.max(0, parseInt(color.substring(4, 6), 16) * (1 - amount));
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

export interface BookingEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string;
  backgroundColor?: string;
  clientName?: string;
  clientPhone?: string;
  serviceName?: string;
  masterName?: string;
  status?: string;
}

interface WorkingDay {
  start: string;
  end: string;
  enabled: boolean;
}

interface WorkingHours {
  monday?: WorkingDay;
  tuesday?: WorkingDay;
  wednesday?: WorkingDay;
  thursday?: WorkingDay;
  friday?: WorkingDay;
  saturday?: WorkingDay;
  sunday?: WorkingDay;
  [key: string]: WorkingDay | undefined;
}

export interface Resource {
  id: string;
  title: string;
  color?: string;
  avatar?: string;
  workingHours?: WorkingHours;
}

export interface SlotMenuAction {
  type: 'booking' | 'group-booking' | 'block-time';
  start: Date;
  end: Date;
  resourceId?: string;
}

interface CustomCalendarProps {
  events?: BookingEvent[];
  resources?: Resource[];
  selectedDate?: Date;
  onEventClick?: (event: BookingEvent) => void;
  onSlotClick?: (slotInfo: { start: Date; end: Date; resourceId?: string }) => void;
  onSlotAction?: (action: SlotMenuAction) => void;
  onEventDrop?: (event: BookingEvent, newStart: Date, newEnd: Date, newResourceId?: string) => void;
  onEventResize?: (event: BookingEvent, newEnd: Date) => void;
  dayStart?: number;
  dayEnd?: number;
  slotDuration?: number;
  timezone?: string;
}

// Helper to get current time in a specific timezone
function getTimeInTimezone(timezone: string): { hours: number; minutes: number } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  return { hours, minutes };
}

// Helper to check if selected date is today in the salon's timezone
function isTodayInTimezone(selectedDate: Date, timezone: string): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = formatter.format(now);
  const selectedStr = formatter.format(selectedDate);
  return todayStr === selectedStr;
}

// Get day name from date
const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getDayName(date: Date): string {
  return dayNames[date.getDay()];
}

// Check if hour is within working hours for a resource on given day
function isWorkingHour(resource: Resource, dayName: string, hour: number): boolean {
  if (!resource.workingHours) return true; // No schedule = always available
  
  const daySchedule = resource.workingHours[dayName];
  if (!daySchedule || !daySchedule.enabled) return false; // Day off
  
  const startHour = parseInt(daySchedule.start.split(':')[0], 10);
  const endHour = parseInt(daySchedule.end.split(':')[0], 10);
  
  return hour >= startHour && hour < endHour;
}

export function CustomCalendar({
  events = [],
  resources = [],
  selectedDate,
  onEventClick,
  onSlotClick,
  onSlotAction,
  onEventDrop,
  onEventResize,
  dayStart = 8,
  dayEnd = 21,
  timezone = 'Europe/Kiev',
}: CustomCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Constants
  const hourHeight = 60; // 60px per hour
  const timeColWidth = 50;
  const colMinWidth = 120;

  // Slot context menu state
  const [slotMenu, setSlotMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    slotInfo: { start: Date; end: Date; resourceId: string } | null;
  }>({ isOpen: false, x: 0, y: 0, slotInfo: null });

  // Drag state
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    event: BookingEvent | null;
    startY: number;
    startX: number;
    currentY: number;
    currentX: number;
    originalTop: number;
    originalHeight: number;
    originalWidth: number;
    currentResourceId: string | null;
  }>({ isDragging: false, event: null, startY: 0, startX: 0, currentY: 0, currentX: 0, originalTop: 0, originalHeight: 0, originalWidth: 0, currentResourceId: null });

  // Resize state
  const [resizeState, setResizeState] = useState<{
    isResizing: boolean;
    event: BookingEvent | null;
    startY: number;
  }>({ isResizing: false, event: null, startY: 0 });

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (slotMenu.isOpen) {
        setSlotMenu(prev => ({ ...prev, isOpen: false }));
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [slotMenu.isOpen]);

  // Синхронизация скролла header и body
  const handleScroll = () => {
    if (scrollRef.current && headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
  };

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = dayStart; hour < dayEnd; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, [dayStart, dayEnd]);

  const currentDate = selectedDate || new Date();
  const currentDateStr = currentDate.toISOString().split('T')[0];
  const isToday = isTodayInTimezone(currentDate, timezone);
  const currentDayName = getDayName(currentDate);

  const getEventPosition = (event: BookingEvent) => {
    const startHour = event.start.getHours();
    const startMin = event.start.getMinutes();
    const endHour = event.end.getHours();
    const endMin = event.end.getMinutes();
    
    const startMinutes = (startHour - dayStart) * 60 + startMin;
    const endMinutes = (endHour - dayStart) * 60 + endMin;
    const durationMinutes = Math.max(30, endMinutes - startMinutes);
    
    return { startMinutes, durationMinutes };
  };

  const getEventsForResource = (resourceId: string) => {
    return events.filter(e => e.resourceId === resourceId);
  };

  const handleSlotClick = (e: React.MouseEvent, hour: number, minute: number, resourceId: string) => {
    e.stopPropagation();
    
    const start = new Date(currentDate);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);
    
    // Show context menu
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setSlotMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      slotInfo: { start, end, resourceId }
    });
  };

  const handleMenuAction = (type: 'booking' | 'group-booking' | 'block-time') => {
    if (slotMenu.slotInfo && onSlotAction) {
      onSlotAction({
        type,
        start: slotMenu.slotInfo.start,
        end: slotMenu.slotInfo.end,
        resourceId: slotMenu.slotInfo.resourceId
      });
    }
    setSlotMenu(prev => ({ ...prev, isOpen: false }));
  };

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, event: BookingEvent, element: HTMLElement) => {
    e.stopPropagation();
    e.preventDefault();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    
    // Get actual element dimensions
    const rect = element.getBoundingClientRect();
    const originalWidth = rect.width;
    const originalHeight = rect.height;
    
    setDragState({
      isDragging: true,
      event,
      startY: clientY,
      startX: clientX,
      currentY: clientY,
      currentX: clientX,
      originalTop: rect.top,
      originalHeight,
      originalWidth,
      currentResourceId: event.resourceId || null
    });
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, event: BookingEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setResizeState({
      isResizing: true,
      event,
      startY: clientY
    });
  };

  // Global mouse/touch move and end handlers for drag & resize
  useEffect(() => {
    if (!dragState.isDragging && !resizeState.isResizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      
      if (dragState.isDragging) {
        // Update current position for visual feedback
        setDragState(prev => ({ ...prev, currentY: clientY, currentX: clientX }));
      }
      
      if (resizeState.isResizing && resizeState.event) {
        // Update startY for visual feedback
        setResizeState(prev => ({ ...prev, startY: clientY }));
      }
    };

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      if (resizeState.isResizing && resizeState.event) {
        const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
        const deltaY = clientY - resizeState.startY;
        const deltaMinutes = Math.round(deltaY / (hourHeight / 60));
        
        if (Math.abs(deltaMinutes) >= 5) {
          const newEndTime = new Date(resizeState.event.end.getTime());
          const totalDelta = clientY - resizeState.startY;
          const totalMinutes = Math.round(totalDelta / (hourHeight / 60));
          newEndTime.setTime(resizeState.event.end.getTime() + totalMinutes * 60000);
          // Snap to 15 minutes
          newEndTime.setMinutes(Math.round(newEndTime.getMinutes() / 15) * 15);
          
          // Minimum 15 min duration
          if (newEndTime.getTime() > resizeState.event.start.getTime() + 15 * 60000) {
            onEventResize?.(resizeState.event, newEndTime);
          }
        }
        setResizeState({ isResizing: false, event: null, startY: 0 });
      }

      if (dragState.isDragging && dragState.event && scrollRef.current) {
        const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
        const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
        const deltaY = clientY - dragState.startY;
        const deltaMinutes = Math.round(deltaY / (hourHeight / 60));
        
        // Snap to 15 minutes
        const snappedMinutes = Math.round(deltaMinutes / 15) * 15;
        
        // Determine which resource column we're over
        const scrollRect = scrollRef.current.getBoundingClientRect();
        const relativeX = clientX - scrollRect.left + scrollRef.current.scrollLeft - timeColWidth;
        const columnWidth = (scrollRect.width - timeColWidth) / resources.length;
        const resourceIndex = Math.floor(relativeX / columnWidth);
        const clampedIndex = Math.max(0, Math.min(resourceIndex, resources.length - 1));
        const newResourceId = resources[clampedIndex]?.id || dragState.event.resourceId;
        
        const newStart = new Date(dragState.event.start.getTime() + snappedMinutes * 60000);
        const newEnd = new Date(dragState.event.end.getTime() + snappedMinutes * 60000);
        
        // Check if anything changed
        const timeChanged = Math.abs(snappedMinutes) >= 15;
        const resourceChanged = newResourceId !== dragState.event.resourceId;
        
        if ((timeChanged || resourceChanged) && newStart.getHours() >= dayStart && newEnd.getHours() <= dayEnd) {
          onEventDrop?.(dragState.event, newStart, newEnd, newResourceId);
        }
        
        setDragState({ isDragging: false, event: null, startY: 0, startX: 0, currentY: 0, currentX: 0, originalTop: 0, originalHeight: 0, originalWidth: 0, currentResourceId: null });
      }
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [dragState, resizeState, onEventDrop, onEventResize, dayStart, dayEnd, resources, timeColWidth]);

  const [salonTime, setSalonTime] = useState(() => getTimeInTimezone(timezone));
  
  // Update time every minute using salon's timezone
  useEffect(() => {
    setSalonTime(getTimeInTimezone(timezone));
    const interval = setInterval(() => {
      setSalonTime(getTimeInTimezone(timezone));
    }, 60000); // every minute
    return () => clearInterval(interval);
  }, [timezone]);
  
  const currentHour = salonTime.hours;
  const currentMin = salonTime.minutes;
  
  const headerHeight = 80;
  
  const formatTime = (date: Date) => 
    `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  
  const currentTimeTop = isToday && currentHour >= dayStart && currentHour < dayEnd
    ? ((currentHour - dayStart) * 60 + currentMin) / 60 * hourHeight
    : null;

  // Получить только имя (первое слово)
  const getFirstName = (fullName: string) => fullName.split(' ')[0];

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* FIXED HEADER */}
      <div className="flex-shrink-0 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-700/60 z-20">
        <div className="flex">
          {/* Time column header */}
          <div 
            className="flex-shrink-0 border-r border-slate-200/60 dark:border-slate-700/60"
            style={{ width: timeColWidth, height: headerHeight }}
          />
          {/* Resources header - scrollable */}
          <div 
            ref={headerScrollRef}
            className="flex-1 overflow-hidden"
          >
            <div 
              className="flex"
              style={{ width: resources.length * colMinWidth }}
            >
              {resources.map((resource, idx) => (
                <div
                  key={`header-${resource.id}`}
                  className={`flex flex-col items-center justify-center py-2 gap-1 border-r border-slate-200/60 dark:border-slate-700/60`}
                  style={{ width: colMinWidth, height: headerHeight }}
                >
                  <div 
                    className="w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg ring-2 ring-white/60"
                    style={{ backgroundColor: resource.color || '#9ca3af' }}
                  >
                    {resource.avatar ? (
                      <Image 
                        src={resource.avatar} 
                        alt={resource.title} 
                        width={44} 
                        height={44} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-base font-semibold">
                        {resource.title.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center px-1">
                    {getFirstName(resource.title)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SCROLLABLE BODY */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-auto overscroll-none"
        onScroll={handleScroll}
      >
        <div className="flex" style={{ width: timeColWidth + resources.length * colMinWidth }}>
          {/* Time column */}
          <div 
            className="flex-shrink-0 sticky left-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 relative"
            style={{ width: timeColWidth }}
          >
            {timeSlots.map((time, idx) => (
              <div
                key={`time-${time}`}
                className="flex items-start justify-end pr-2 border-r border-slate-200/60 dark:border-slate-700/60"
                style={{ height: hourHeight }}
              >
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold -mt-1.5">
                  {time}
                </span>
              </div>
            ))}
            {/* Current time badge - fixed in time column */}
            {currentTimeTop !== null && (
              <div 
                className="absolute z-30 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-sm font-semibold shadow-md"
                style={{ 
                  top: currentTimeTop - 8,
                  left: 2,
                  right: 2,
                  textAlign: 'center',
                }}
              >
                {`${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`}
              </div>
            )}
          </div>

          {/* Resource columns */}
          <div className="flex" style={{ width: resources.length * colMinWidth }}>
            {resources.map((resource) => (
              <div
                key={`col-${resource.id}`}
                className="relative border-r border-slate-200/60 dark:border-slate-700/60"
                style={{ width: colMinWidth }}
              >
                {/* Hour lines - two 30-min slots per hour */}
                {timeSlots.map((time, idx) => {
                  const hour = dayStart + idx;
                  const isWorking = isWorkingHour(resource, currentDayName, hour);
                  return (
                    <div
                      key={`cell-${time}-${resource.id}`}
                      className="relative border-b border-slate-200/50 dark:border-slate-700/50"
                      style={{ height: hourHeight }}
                    >
                      {/* First half hour (XX:00) */}
                      <div
                        className={`absolute inset-x-0 top-0 h-1/2 transition-colors ${
                          isWorking 
                            ? 'hover:bg-primary/10 cursor-pointer' 
                            : 'bg-slate-200/60 dark:bg-slate-700/40 cursor-not-allowed'
                        }`}
                        onClick={(e) => isWorking && handleSlotClick(e, hour, 0, resource.id)}
                      />
                      {/* Second half hour (XX:30) */}
                      <div
                        className={`absolute inset-x-0 bottom-0 h-1/2 border-t border-dashed border-slate-200/30 transition-colors ${
                          isWorking 
                            ? 'hover:bg-primary/10 cursor-pointer' 
                            : 'bg-slate-200/60 dark:bg-slate-700/40 cursor-not-allowed'
                        }`}
                        onClick={(e) => isWorking && handleSlotClick(e, hour, 30, resource.id)}
                      />
                    </div>
                  );
                })}

                {/* Events */}
                {getEventsForResource(resource.id).map((event) => {
                  const { startMinutes, durationMinutes } = getEventPosition(event);
                  const top = (startMinutes / 60) * hourHeight;
                  const height = (durationMinutes / 60) * hourHeight;
                  const bgColor = event.backgroundColor || '#4eb8d5';
                  const darkColor = darkenColor(bgColor, 0.35);
                  const isDragging = dragState.isDragging && dragState.event?.id === event.id;
                  const isResizing = resizeState.isResizing && resizeState.event?.id === event.id;

                  return (
                    <div
                      key={event.id}
                      className={`absolute left-0 right-0 rounded-[3px] overflow-hidden cursor-grab hover:brightness-105 select-none ${
                        isDragging ? 'opacity-30 cursor-grabbing' : ''
                      } ${isResizing ? 'z-50' : ''}`}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: bgColor,
                        borderLeft: `2px solid ${darkColor}`,
                        boxShadow: `0 0 0 1px ${darkColor}`,
                        transition: isDragging ? 'none' : 'all 0.15s ease',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!dragState.isDragging && !resizeState.isResizing) {
                          onEventClick?.(event);
                        }
                      }}
                      onMouseDown={(e) => onEventDrop && handleDragStart(e, event, e.currentTarget)}
                      onTouchStart={(e) => onEventDrop && handleDragStart(e, event, e.currentTarget)}
                    >
                      <div className="p-1.5 pl-2 text-white h-full overflow-hidden relative">
                        <div className="font-semibold text-[11px] drop-shadow-sm">
                          {formatTime(event.start)} - {formatTime(event.end)}
                        </div>
                        <div className="font-medium text-xs truncate">{event.clientName}</div>
                        {height > 50 && (
                          <div className="opacity-80 text-[10px] truncate">{event.title}</div>
                        )}
                        {/* Resize handle at bottom */}
                        {onEventResize && !isDragging && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 h-3 cursor-s-resize hover:bg-black/20 flex items-center justify-center"
                            onMouseDown={(e) => handleResizeStart(e, event)}
                            onTouchStart={(e) => handleResizeStart(e, event)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="w-8 h-1 rounded bg-white/50" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Current time line */}
          {currentTimeTop !== null && (
            <div 
              className="absolute h-0.5 bg-red-500 z-20 shadow-sm pointer-events-none"
              style={{ 
                top: currentTimeTop,
                left: timeColWidth,
                right: 0,
              }}
            />
          )}
        </div>
      </div>

      {/* Floating drag card - rendered via Portal to avoid transform issues */}
      {dragState.isDragging && dragState.event && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            left: dragState.currentX,
            top: dragState.currentY,
            transform: 'translate(-50%, -30%)',
            width: dragState.originalWidth,
            height: dragState.originalHeight,
            backgroundColor: dragState.event.backgroundColor || '#4eb8d5',
            borderLeft: `4px solid ${darkenColor(dragState.event.backgroundColor || '#4eb8d5', 0.35)}`,
            borderRadius: 4,
            boxShadow: '0 12px 40px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 99999,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '6px 8px', color: 'white', height: '100%' }}>
            <div style={{ fontWeight: 600, fontSize: 11 }}>
              {formatTime(dragState.event.start)} - {formatTime(dragState.event.end)}
            </div>
            <div style={{ fontWeight: 500, fontSize: 12, marginTop: 2 }}>{dragState.event.clientName}</div>
            {dragState.originalHeight > 50 && (
              <div style={{ opacity: 0.8, fontSize: 10, marginTop: 2 }}>{dragState.event.title}</div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Slot Context Menu */}
      {slotMenu.isOpen && slotMenu.slotInfo && (
        <div
          className="fixed z-50 bg-zinc-900 rounded-xl shadow-2xl border border-zinc-700 overflow-hidden min-w-[200px]"
          style={{ 
            left: slotMenu.x,
            top: slotMenu.y,
            transform: 'translate(-50%, 8px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with time */}
          <div className="px-4 py-2 border-b border-zinc-700 flex items-center justify-between">
            <span className="text-white font-medium">
              {formatTime(slotMenu.slotInfo.start)}
            </span>
            <button 
              onClick={() => setSlotMenu(prev => ({ ...prev, isOpen: false }))}
              className="text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          {/* Menu items */}
          <div className="py-1">
            <button
              className="w-full px-4 py-2.5 text-left text-zinc-200 hover:bg-zinc-800 flex items-center gap-3 transition-colors"
              onClick={() => handleMenuAction('booking')}
            >
              <span className="text-lg">📅</span>
              <span>Додати запис</span>
            </button>
            <button
              className="w-full px-4 py-2.5 text-left text-zinc-200 hover:bg-zinc-800 flex items-center gap-3 transition-colors"
              onClick={() => handleMenuAction('group-booking')}
            >
              <span className="text-lg">👥</span>
              <span>Додати групову запис</span>
            </button>
            <button
              className="w-full px-4 py-2.5 text-left text-zinc-200 hover:bg-zinc-800 flex items-center gap-3 transition-colors"
              onClick={() => handleMenuAction('block-time')}
            >
              <span className="text-lg">🚫</span>
              <span>Заблокувати час</span>
            </button>
          </div>
          
          {/* Footer link */}
          <div className="px-4 py-2 border-t border-zinc-700">
            <button className="text-sm text-blue-400 hover:text-blue-300">
              Налаштування швидких дій
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
