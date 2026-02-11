'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, X, Phone, MessageCircle, User, Clock, Scissors } from 'lucide-react';

export interface CalendarEvent {
  id: string;
  text: string;
  start: string;
  end: string;
  resource: string;
  backColor?: string;
  barColor?: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  serviceId?: string;
  serviceName?: string;
  masterName?: string;
  isNewClient?: boolean;
  status?: string;
  duration?: number;
  price?: number;
}

export interface CalendarResource {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
}

interface DayPilotResourceCalendarProps {
  resources: CalendarResource[];
  events: CalendarEvent[];
  startDate: Date;
  onDateChange?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventMove?: (eventId: string, newStart: Date, newEnd: Date, newResourceId: string) => void;
  onEventResize?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onTimeRangeSelect?: (start: Date, end: Date, resourceId: string) => void;
  onEmptySlotMenu?: (x: number, y: number, slotInfo: { startMin: number; resourceId: string; cellRect?: { top: number; left: number; width: number; height: number }; scrollEl?: HTMLElement }) => void;
  timeStep?: 5 | 15 | 30;
  dayStartHour?: number;
  dayEndHour?: number;
  timezone?: string;
  viewMode?: 'day' | 'week';
  salonWorkingHours?: Record<string, { start: string; end: string; enabled: boolean }> | null;
  masterWorkingHours?: Record<string, Record<string, { start: string; end: string; enabled: boolean }>>;
  hideResourceHeader?: boolean;
  columnMinWidth?: number;
  accentColor?: string;
  onEventStatusChange?: (eventId: string, newStatus: string) => Promise<void>;
}

// Українські назви днів
const ukDaysShort = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

// Затемнити колір на X%
function darkenColor(hex: string, percent: number = 20): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const R = Math.max((num >> 16) - Math.round(2.55 * percent), 0);
  const G = Math.max((num >> 8 & 0x00FF) - Math.round(2.55 * percent), 0);
  const B = Math.max((num & 0x0000FF) - Math.round(2.55 * percent), 0);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// Mix color with white (0 = white, 100 = full color)
function tintColor(hex: string, amount: number = 10): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xFF;
  const g = (num >> 8) & 0xFF;
  const b = num & 0xFF;
  const t = amount / 100;
  const R = Math.round(255 + (r - 255) * t);
  const G = Math.round(255 + (g - 255) * t);
  const B = Math.round(255 + (b - 255) * t);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function formatMinutes(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ============================================================
// Drag & Drop + Resize — типи та константи
// ============================================================
type InteractionMode = 'move' | 'resize-top' | 'resize-bottom';

interface DragState {
  event: CalendarEvent;
  mode: InteractionMode;
  ghostX: number;
  ghostY: number;
  grabOffsetY: number;
  grabOffsetMin: number;
  targetResourceId: string;
  targetStartMin: number;
  targetEndMin: number;
  phase: 'pending' | 'dragging';
  isPhantom?: boolean; // створення нового запису з пустого місця
}

const LONG_PRESS_MS = 400;
const TOUCH_MOVE_THRESHOLD = 10;
const MOUSE_MOVE_THRESHOLD = 5;
const RESIZE_HANDLE_HEIGHT = 12; // px — зона захвату resize (top/bottom)

export function DayPilotResourceCalendar({
  resources,
  events,
  startDate,
  onDateChange,
  onEventClick,
  onEventMove,
  onEventResize,
  onTimeRangeSelect,
  onEmptySlotMenu,
  timeStep = 15,
  dayStartHour = 8,
  dayEndHour = 21,
  timezone = 'Europe/Kiev',
  viewMode = 'day',
  salonWorkingHours,
  masterWorkingHours,
  hideResourceHeader = false,
  columnMinWidth = 120,
  onEventStatusChange,
}: DayPilotResourceCalendarProps) {
  const [internalDate, setInternalDate] = useState(startDate);
  const [mounted, setMounted] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Status dropdown state
  const [statusDropdown, setStatusDropdown] = useState<{ eventId: string; x: number; y: number } | null>(null);
  const [statusDropdownVisible, setStatusDropdownVisible] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  // Local events for optimistic status updates
  const [localStatusOverrides, setLocalStatusOverrides] = useState<Record<string, string>>({});

  // Поточний час салону (timezone-aware)
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);
  const [nowTimeStr, setNowTimeStr] = useState<string>('');
  const [isToday_, setIsToday_] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      // Час салону через Intl
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(now);
      const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
      const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
      setNowMinutes(h * 60 + m);
      setNowTimeStr(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

      // Чи сьогодні (в timezone салону)
      const salonDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(now);
      const selectedStr = `${internalDate.getFullYear()}-${String(internalDate.getMonth() + 1).padStart(2, '0')}-${String(internalDate.getDate()).padStart(2, '0')}`;
      setIsToday_(salonDateStr === selectedStr);
    };

    update();
    const interval = setInterval(update, 10000); // кожні 10 сек
    const onVisible = () => { if (document.visibilityState === 'visible') update(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, [timezone, internalDate]);

  // Drag state — dragActive (boolean) для React, все координати через refs + DOM
  const dragRef = useRef<DragState | null>(null);
  const [dragActive, setDragActive] = useState<{ eventId: string; mode: InteractionMode } | null>(null);
  const [flipHiddenId, setFlipHiddenId] = useState<string | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pendingMouseEvent = useRef<{ event: CalendarEvent; mode: InteractionMode } | null>(null);
  const pendingTouchMode = useRef<InteractionMode>('move');
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedBodyOverflow = useRef<string>('');
  const didDrag = useRef(false);
  const autoScrollRef = useRef<number>(0);

  // Ghost refs (оновлюються через DOM, не React)
  const ghostCardRef = useRef<HTMLDivElement>(null);
  const ghostLabelRef = useRef<HTMLDivElement>(null);
  const timeLineRef = useRef<HTMLDivElement>(null);
  const timeLineBadgeRef = useRef<HTMLDivElement>(null);

  // Drop preview — rAF інтерполяція
  const previewRef = useRef<HTMLDivElement>(null);
  const previewTarget = useRef({ x: 0, y: 0, h: 0, active: false });
  const previewCurrent = useRef({ x: 0, y: 0, h: 0 });
  const previewAnimRef = useRef<number>(0);
  const previewColorRef = useRef<string>('#666');
  const previewInitRef = useRef(false);
  const appliedResourceRef = useRef<string | null>(null);
  const pendingColorRef = useRef<string>('#666');
  const appliedColorRef = useRef<string>('#666');
  const appliedNameRef = useRef<string>('?');
  const resourcesCountRef = useRef(resources.length);
  const flipRef = useRef<{ eventId: string; from: DOMRect } | null>(null);

  // Long press on empty space refs
  const emptyLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emptyTouchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Тримаємо кількість ресурсів в ref для rAF loop
  useEffect(() => { resourcesCountRef.current = resources.length; }, [resources.length]);

  // Відкрити модалку з деталями запису
  const openEventModal = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  // Закрити модалку
  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => setSelectedEvent(null), 300);
  };

  // Status dropdown handlers
  const openStatusDropdown = useCallback((eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setStatusDropdown({ eventId, x: rect.left, y: rect.bottom + 4 });
    // Trigger animation on next frame
    requestAnimationFrame(() => setStatusDropdownVisible(true));
  }, []);

  const closeStatusDropdown = useCallback(() => {
    setStatusDropdownVisible(false);
    setTimeout(() => setStatusDropdown(null), 200);
  }, []);

  const handleStatusSelect = useCallback(async (eventId: string, newStatus: string) => {
    // Map display status to API status
    const statusMap: Record<string, string> = {
      'completed': 'COMPLETED',
      'no_show': 'NO_SHOW',
      'cancelled': 'CANCELLED',
    };
    const apiStatus = statusMap[newStatus] || newStatus.toUpperCase();

    // Optimistic update
    setLocalStatusOverrides(prev => ({ ...prev, [eventId]: newStatus }));
    closeStatusDropdown();

    if (onEventStatusChange) {
      try {
        await onEventStatusChange(eventId, apiStatus);
      } catch {
        // Revert on error
        setLocalStatusOverrides(prev => {
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
      }
    }
  }, [onEventStatusChange, closeStatusDropdown]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!statusDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        closeStatusDropdown();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [statusDropdown, closeStatusDropdown]);

  // Compute effective events with local overrides
  const effectiveEvents: CalendarEvent[] = useMemo(() => {
    if (Object.keys(localStatusOverrides).length === 0) return events;
    return events.map((e: CalendarEvent) => localStatusOverrides[e.id] ? { ...e, status: localStatusOverrides[e.id] } : e);
  }, [events, localStatusOverrides]);

  // Clear overrides when parent events change (they've been saved)
  useEffect(() => {
    setLocalStatusOverrides({});
  }, [events]);

  // Отримати ресурс (майстра) за id
  const getResourceById = (resourceId: string) => {
    return resources.find(r => r.id === resourceId);
  };

  // ============================================================
  // getGridPosition — з урахуванням скролів і sticky time column
  // ============================================================
  const getGridPosition = useCallback((clientX: number, clientY: number) => {
    if (!gridRef.current) return null;
    const grid = gridRef.current;

    // Scroll container (вертикальний + горизонтальний скрол)
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return null;

    const resourcesContainer = grid.querySelector('[data-resources]') as HTMLElement;
    if (!resourcesContainer) return null;

    // Позиція resources container відносно viewport
    const rcRect = resourcesContainer.getBoundingClientRect();

    // Відносні координати всередині resources container (вже враховує скрол бо getBoundingClientRect повертає viewport coords)
    const relX = clientX - rcRect.left;
    const relY = clientY - rcRect.top;

    // Ширина однієї колонки ресурсу
    if (resources.length === 0) return null;
    const cellW = resourcesContainer.offsetWidth / resources.length;
    const resourceIdx = Math.max(0, Math.min(resources.length - 1, Math.floor(relX / cellW)));
    const resourceId = resources[resourceIdx]?.id || '';

    // Розрахунок часу — grid height = hours.length * 60px
    const totalMinutes = (dayEndHour - dayStartHour) * 60;
    const gridHeight = resourcesContainer.offsetHeight;
    // relY може бути від'ємним якщо курсор над grid — clamp
    const clampedY = Math.max(0, Math.min(gridHeight, relY));
    const rawMinutes = Math.round((clampedY / gridHeight) * totalMinutes / timeStep) * timeStep; // snap
    // Компенсація зміщення: events/мітки зміщені на +timeStep, тому віднімаємо
    const minutes = Math.max(0, rawMinutes - timeStep);
    const startMin = dayStartHour * 60 + Math.min(totalMinutes - timeStep, minutes);

    return { resourceId, startMin, resourceIdx };
  }, [resources, dayStartHour, dayEndHour, timeStep]);

  // ============================================================
  // Helpers: event → minutes
  // ============================================================
  const getEventMinutes = useCallback((event: CalendarEvent) => {
    const s = new Date(event.start);
    const e = new Date(event.end);
    return {
      startMin: s.getHours() * 60 + s.getMinutes(),
      endMin: e.getHours() * 60 + e.getMinutes(),
    };
  }, []);

  // ============================================================
  // Drag / Resize lifecycle helpers
  // ============================================================
  const lockScroll = useCallback(() => {
    savedBodyOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const sc = scrollContainerRef.current;
    if (sc) {
      const blockScroll = (ev: TouchEvent) => { ev.preventDefault(); };
      sc.addEventListener('touchmove', blockScroll, { passive: false });
      ((sc as unknown) as Record<string, unknown>).__blockScroll = blockScroll;
      sc.style.overflowY = 'hidden';
      sc.style.overflowX = 'hidden';
    }
  }, []);

  const unlockScroll = useCallback(() => {
    document.body.style.overflow = savedBodyOverflow.current;
    const sc = scrollContainerRef.current;
    if (sc) {
      const fn = ((sc as unknown) as Record<string, unknown>).__blockScroll as EventListener | undefined;
      if (fn) {
        sc.removeEventListener('touchmove', fn);
        delete ((sc as unknown) as Record<string, unknown>).__blockScroll;
      }
      sc.style.overflowY = '';
      sc.style.overflowX = '';
    }
  }, []);

  // Чи дата в минулому (не дозволяємо drag)
  const isPastDate = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(internalDate);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
  }, [internalDate]);

  // Оновити ghost + time line через DOM (без React re-render)
  const updateGhostDOM = useCallback(() => {
    const d = dragRef.current;
    if (!d || d.phase !== 'dragging') return;

    const gc = ghostCardRef.current;
    if (gc) {
      const offsetY = d.mode === 'move' ? d.grabOffsetY : gc.offsetHeight + 22;
      gc.style.transform = `translate3d(${d.ghostX - 70}px, ${d.ghostY - offsetY}px, 0)`;
      gc.style.opacity = '1';
      const timeEl = gc.querySelector('[data-ghost-time]');
      if (timeEl) timeEl.textContent = `${formatMinutes(d.targetStartMin)} – ${formatMinutes(d.targetEndMin)}`;
      const nameEl = gc.querySelector('[data-ghost-name]');
      if (nameEl) nameEl.textContent = d.isPhantom ? 'Новий запис' : (d.event.clientName || d.event.text);
      // Колір ghost = applied (не target!) — міняється в rAF коли preview доїде
      const ghostColor = appliedColorRef.current;
      const cardInner = gc.querySelector('[data-ghost-card]') as HTMLElement;
      if (cardInner) cardInner.style.background = `linear-gradient(160deg, ${ghostColor} 0%, ${darkenColor(ghostColor, 15)} 100%)`;
    }

    const gl = ghostLabelRef.current;
    if (gl) {
      gl.style.transform = `translate3d(${d.ghostX - 70}px, ${d.ghostY + 44}px, 0)`;
      gl.style.opacity = '1';
      const labelText = gl.querySelector('[data-ghost-label]');
      if (labelText) {
        if (d.isPhantom) {
          labelText.textContent = `✚ ${appliedNameRef.current}`;
        } else {
          labelText.textContent = d.mode === 'move'
            ? `→ ${appliedNameRef.current}`
            : `↕ ${d.mode === 'resize-top' ? 'початок' : 'кінець'}`;
        }
      }
    }

    const tl = timeLineRef.current;
    const tb = timeLineBadgeRef.current;
    if (tl) {
      const totalMinutes = (dayEndHour - dayStartHour) * 60;
      const topPct = ((d.targetStartMin - dayStartHour * 60) / totalMinutes) * 100;
      tl.style.top = `${topPct}%`;
      tl.style.opacity = '1';
    }
    if (tb) tb.textContent = formatMinutes(d.targetStartMin);
  }, [resources, dayStartHour, dayEndHour]);

  // Оновити preview target напряму (без React re-render)
  const updatePreviewTarget = useCallback(() => {
    const d = dragRef.current;
    if (!d || d.phase !== 'dragging') {
      previewTarget.current.active = false;
      return;
    }
    if (resources.length === 0) return;
    const totalMinutes = (dayEndHour - dayStartHour) * 60;
    const previewStartMin = d.targetStartMin - dayStartHour * 60;
    const previewEndMin = d.targetEndMin - dayStartHour * 60;
    const grid = gridRef.current;
    if (!grid) return;
    const gridH = grid.offsetHeight;
    const colIdx = resources.findIndex(r => r.id === d.targetResourceId);
    // X в координатах gridRef: 40px (time column) + colIdx * colWidth
    const timeColW = 40;
    const container = grid.querySelector('[data-resources]') as HTMLElement;
    const colWidth = container && resources.length > 0 ? container.offsetWidth / resources.length : 110;
    
    previewTarget.current = {
      x: timeColW + colIdx * colWidth,
      y: (previewStartMin / totalMinutes) * gridH,
      h: ((previewEndMin - previewStartMin) / totalMinutes) * gridH,
      active: true,
    };
    // Pending — застосується коли preview доїде по X
    pendingColorRef.current = resources[colIdx]?.color || '#666';
  }, [resources, dayStartHour, dayEndHour]);

  const startDrag = useCallback((event: CalendarEvent, mode: InteractionMode, clientX: number, clientY: number) => {
    if (isPastDate()) return;
    // Блокувати drag для минулих подій
    if (event.end) {
      const endDate = typeof event.end === 'string' ? new Date(event.end) : event.end;
      if (endDate < new Date()) return;
    }
    didDrag.current = true;
    if (navigator.vibrate) { try { navigator.vibrate(50); } catch {} }
    lockScroll();
    document.body.style.cursor = mode === 'move' ? 'grabbing' : 'ns-resize';

    const pos = getGridPosition(clientX, clientY);
    const { startMin, endMin } = getEventMinutes(event);

    const el = document.querySelector(`[data-event-id="${event.id}"]`) as HTMLElement | null;
    const rect = el?.getBoundingClientRect();
    const grabOffsetY = rect ? (clientY - rect.top) : 0;
    let grabOffsetMin = 0;
    if (gridRef.current) {
      const totalMinutes = (dayEndHour - dayStartHour) * 60;
      const gridH = gridRef.current.offsetHeight || 1;
      const minutesPerPx = totalMinutes / gridH;
      grabOffsetMin = Math.round((grabOffsetY * minutesPerPx) / timeStep) * timeStep;
    }

    const state: DragState = {
      event,
      mode,
      ghostX: clientX,
      ghostY: clientY,
      grabOffsetY,
      grabOffsetMin,
      targetResourceId: mode === 'move' ? event.resource : (pos?.resourceId || event.resource),
      targetStartMin: mode === 'move' ? startMin : startMin,
      targetEndMin: mode === 'move' ? endMin : endMin,
      phase: 'dragging',
    };

    // Для resize встановлюємо правильні початкові значення
    if (mode === 'resize-top') {
      state.targetStartMin = pos?.startMin || startMin;
      state.targetEndMin = endMin;
    } else if (mode === 'resize-bottom') {
      state.targetStartMin = startMin;
      state.targetEndMin = pos?.startMin ? pos.startMin + timeStep : endMin;
    }

    dragRef.current = state;
    previewInitRef.current = false;
    // Applied = стартовий ресурс (колір/ім'я показані одразу)
    appliedResourceRef.current = state.targetResourceId;
    const startRes = resources.find(r => r.id === state.targetResourceId);
    appliedColorRef.current = startRes?.color || event.backColor || '#666';
    appliedNameRef.current = startRes?.name || '?';
    pendingColorRef.current = appliedColorRef.current;
    previewColorRef.current = appliedColorRef.current;
    updatePreviewTarget();
    updateGhostDOM();

    // animate ghost split (card up, label down)
    if (ghostCardRef.current) {
      const inner = ghostCardRef.current.querySelector('[data-ghost-card]') as HTMLElement | null;
      if (inner) {
        inner.classList.remove('animate-ghost-up');
        void inner.offsetWidth;
        inner.classList.add('animate-ghost-up');
      }
    }
    if (ghostLabelRef.current) {
      const inner = ghostLabelRef.current.querySelector('[data-ghost-label]') as HTMLElement | null;
      if (inner) {
        inner.classList.remove('animate-ghost-down');
        void inner.offsetWidth;
        inner.classList.add('animate-ghost-down');
      }
    }

    // setState тільки для boolean flag (1 раз при старті)
    setDragActive({ eventId: event.id, mode });
  }, [getGridPosition, getEventMinutes, lockScroll, isPastDate, updatePreviewTarget, updateGhostDOM, timeStep, dayStartHour, dayEndHour]);

  const updateDrag = useCallback((clientX: number, clientY: number) => {
    const d = dragRef.current;
    if (!d || d.phase !== 'dragging') return;
    const pos = getGridPosition(clientX, clientY);
    if (!pos) return;

    d.ghostX = clientX;
    d.ghostY = clientY;

    if (d.mode === 'move') {
      const duration = d.targetEndMin - d.targetStartMin || (
        (new Date(d.event.end).getTime() - new Date(d.event.start).getTime()) / 60000
      );
      d.targetResourceId = pos.resourceId;
      let start = pos.startMin - d.grabOffsetMin;
      const dayMin = dayStartHour * 60;
      const dayMax = dayEndHour * 60 - timeStep;
      start = Math.max(dayMin, Math.min(dayMax, start));
      d.targetStartMin = start;
      d.targetEndMin = start + duration;
    } else if (d.mode === 'resize-top') {
      d.targetStartMin = Math.min(pos.startMin, d.targetEndMin - timeStep);
    } else if (d.mode === 'resize-bottom') {
      d.targetEndMin = Math.max(pos.startMin + timeStep, d.targetStartMin + timeStep);
    }

    // Оновити preview target і ghost через DOM (без setState!)
    updatePreviewTarget();
    updateGhostDOM();
  }, [getGridPosition, updatePreviewTarget, updateGhostDOM, timeStep, dayStartHour, dayEndHour]);

  const endDrag = useCallback((commit: boolean) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (emptyLongPressTimer.current) {
      clearTimeout(emptyLongPressTimer.current);
      emptyLongPressTimer.current = null;
    }

    const state = dragRef.current;
    if (state && state.phase === 'dragging' && commit) {
      const dStr = internalDate.toISOString().split('T')[0];
      const makeDate = (min: number) => {
        const h = Math.floor(min / 60);
        const m = min % 60;
        return new Date(`${dStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
      };

      if (state.isPhantom) {
        // Phantom drag — створення нового запису
        if (onTimeRangeSelect) {
          onTimeRangeSelect(makeDate(state.targetStartMin), makeDate(state.targetEndMin), state.targetResourceId);
        }
      } else if (state.mode === 'move' && onEventMove) {
        // FLIP для ВСІХ переміщень (і вертикальних, і між колонками)
        // translate3d = GPU compositor = 60fps завжди
        const el = document.querySelector(`[data-event-id="${state.event.id}"]`) as HTMLElement | null;
        if (el) {
          // Захоплюємо rect без scale-95 (drag state)
          // Інакше from rect на 5% менший → "стрибок" на старті анімації
          el.style.transition = 'none';
          el.style.transform = 'none';
          const from = el.getBoundingClientRect();
          el.style.transform = '';
          el.style.transition = '';
          flipRef.current = { eventId: state.event.id, from };
          setFlipHiddenId(state.event.id);
        }
        onEventMove(state.event.id, makeDate(state.targetStartMin), makeDate(state.targetEndMin), state.targetResourceId);
      } else if ((state.mode === 'resize-top' || state.mode === 'resize-bottom') && onEventResize) {
        onEventResize(state.event.id, makeDate(state.targetStartMin), makeDate(state.targetEndMin));
      }
    }

    unlockScroll();
    document.body.style.cursor = '';
    dragRef.current = null;
    pendingMouseEvent.current = null;
    previewTarget.current.active = false;
    // Сховати ghost через DOM
    if (ghostCardRef.current) ghostCardRef.current.style.opacity = '0';
    if (ghostLabelRef.current) ghostLabelRef.current.style.opacity = '0';
    if (timeLineRef.current) timeLineRef.current.style.opacity = '0';
    // setState тільки для boolean flag (1 раз при закінченні)
    setDragActive(null);
  }, [internalDate, onEventMove, onEventResize, onTimeRangeSelect, unlockScroll]);

  const cancelDrag = useCallback(() => {
    endDrag(false);
  }, [endDrag]);

  // ============================================================
  // Detect interaction mode from touch/click position on element
  // ============================================================
  const detectMode = useCallback((e: { clientY: number }, target: HTMLElement): InteractionMode => {
    const rect = target.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    if (relY <= RESIZE_HANDLE_HEIGHT) return 'resize-top';
    if (relY >= rect.height - RESIZE_HANDLE_HEIGHT) return 'resize-bottom';
    return 'move';
  }, []);

  // ============================================================
  // Phantom drag — long press на порожньому місці
  // ============================================================
  const startPhantomDrag = useCallback((clientX: number, clientY: number) => {
    if (isPastDate()) return;
    const pos = getGridPosition(clientX, clientY);
    if (!pos) return;

    didDrag.current = true;
    if (navigator.vibrate) { try { navigator.vibrate(50); } catch {} }
    lockScroll();
    document.body.style.cursor = 'grabbing';

    const phantomEvent: CalendarEvent = {
      id: '__phantom__',
      text: 'Новий запис',
      start: '',
      end: '',
      resource: pos.resourceId,
    };

    const startMin = pos.startMin;
    const endMin = startMin + 60; // 1 година за замовчуванням

    const state: DragState = {
      event: phantomEvent,
      mode: 'move',
      ghostX: clientX,
      ghostY: clientY,
      grabOffsetY: 30,
      grabOffsetMin: 0,
      targetResourceId: pos.resourceId,
      targetStartMin: startMin,
      targetEndMin: endMin,
      phase: 'dragging',
      isPhantom: true,
    };

    dragRef.current = state;
    previewInitRef.current = false;
    appliedResourceRef.current = state.targetResourceId;
    const startRes = resources.find(r => r.id === state.targetResourceId);
    appliedColorRef.current = startRes?.color || '#666';
    appliedNameRef.current = startRes?.name || '?';
    pendingColorRef.current = appliedColorRef.current;
    previewColorRef.current = appliedColorRef.current;
    updatePreviewTarget();
    updateGhostDOM();

    if (ghostCardRef.current) {
      const inner = ghostCardRef.current.querySelector('[data-ghost-card]') as HTMLElement | null;
      if (inner) {
        inner.classList.remove('animate-ghost-up');
        void inner.offsetWidth;
        inner.classList.add('animate-ghost-up');
      }
    }
    if (ghostLabelRef.current) {
      const inner = ghostLabelRef.current.querySelector('[data-ghost-label]') as HTMLElement | null;
      if (inner) {
        inner.classList.remove('animate-ghost-down');
        void inner.offsetWidth;
        inner.classList.add('animate-ghost-down');
      }
    }

    setDragActive({ eventId: '__phantom__', mode: 'move' });
  }, [getGridPosition, isPastDate, lockScroll, resources, updatePreviewTarget, updateGhostDOM]);

  const handleEmptyTouchStart = useCallback((e: React.TouchEvent) => {
    // Не запускати якщо тикнули по event
    const target = e.target as HTMLElement;
    if (target.closest('[data-event-id]')) return;

    const touch = e.touches[0];
    emptyTouchStartPos.current = { x: touch.clientX, y: touch.clientY };

    emptyLongPressTimer.current = setTimeout(() => {
      startPhantomDrag(touch.clientX, touch.clientY);
    }, LONG_PRESS_MS);
  }, [startPhantomDrag]);

  const handleEmptyMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-event-id]')) return;

    emptyTouchStartPos.current = { x: e.clientX, y: e.clientY };
    // Для desktop — починаємо phantom drag тільки після перетягування (не long press)
    // Це дозволяє зберегти клік для контекстного меню
  }, []);

  // Скасувати empty long press при русі
  useEffect(() => {
    const handler = (e: TouchEvent) => {
      if (!emptyLongPressTimer.current) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - emptyTouchStartPos.current.x);
      const dy = Math.abs(touch.clientY - emptyTouchStartPos.current.y);
      if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
        clearTimeout(emptyLongPressTimer.current);
        emptyLongPressTimer.current = null;
      }
    };
    document.addEventListener('touchmove', handler, { passive: true });
    return () => document.removeEventListener('touchmove', handler);
  }, []);

  // ============================================================
  // Touch handlers (mobile/tablet)
  // ============================================================
  const handleTouchStart = useCallback((event: CalendarEvent, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    didDrag.current = false;

    const mode = detectMode(touch, e.currentTarget as HTMLElement);
    pendingTouchMode.current = mode;

    longPressTimer.current = setTimeout(() => {
      startDrag(event, mode, touch.clientX, touch.clientY);
    }, LONG_PRESS_MS);
  }, [startDrag, detectMode]);

  // Touch move обробляється через native listener (passive: false)
  // щоб preventDefault() працював і блокував скрол
  useEffect(() => {
    const handler = (e: TouchEvent) => {
      if (!dragRef.current || dragRef.current.phase !== 'dragging') {
        // Перевіряємо long press threshold
        if (longPressTimer.current) {
          const touch = e.touches[0];
          const dx = Math.abs(touch.clientX - touchStartPos.current.x);
          const dy = Math.abs(touch.clientY - touchStartPos.current.y);
          if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }
        return;
      }
      // Drag активний — блокуємо ВСЕ скроли
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      updateDrag(touch.clientX, touch.clientY);
    };
    
    const endHandler = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (emptyLongPressTimer.current) {
        clearTimeout(emptyLongPressTimer.current);
        emptyLongPressTimer.current = null;
      }
      if (dragRef.current && dragRef.current.phase === 'dragging') {
        endDrag(true);
      } else {
        dragRef.current = null;
        setDragActive(null);
      }
    };
    
    document.addEventListener('touchmove', handler, { passive: false });
    document.addEventListener('touchend', endHandler);
    document.addEventListener('touchcancel', endHandler);
    return () => {
      document.removeEventListener('touchmove', handler);
      document.removeEventListener('touchend', endHandler);
      document.removeEventListener('touchcancel', endHandler);
    };
  }, [updateDrag, endDrag]);

  // handleTouchEnd тепер через document listener вище

  // ============================================================
  // Mouse handlers (desktop)
  // ============================================================
  const handleMouseDown = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    mouseStartPos.current = { x: e.clientX, y: e.clientY };
    const mode = detectMode(e, e.currentTarget as HTMLElement);
    pendingMouseEvent.current = { event, mode };
    didDrag.current = false;
  }, [detectMode]);

  // Global mousemove / mouseup
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (pendingMouseEvent.current && (!dragRef.current || dragRef.current.phase === 'pending')) {
        const dx = Math.abs(e.clientX - mouseStartPos.current.x);
        const dy = Math.abs(e.clientY - mouseStartPos.current.y);
        if (dx > MOUSE_MOVE_THRESHOLD || dy > MOUSE_MOVE_THRESHOLD) {
          const { event, mode } = pendingMouseEvent.current;
          startDrag(event, mode, e.clientX, e.clientY);
          pendingMouseEvent.current = null;
        }
        return;
      }
      if (dragRef.current && dragRef.current.phase === 'dragging') {
        updateDrag(e.clientX, e.clientY);
      }
    };

    const onMouseUp = () => {
      if (dragRef.current && dragRef.current.phase === 'dragging') {
        endDrag(true);
      } else {
        pendingMouseEvent.current = null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelDrag();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [startDrag, updateDrag, endDrag, cancelDrag]);

  // ============================================================
  // Фіча 3: Auto-scroll при drag до країв
  // ============================================================
  useEffect(() => {
    if (!dragActive) {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = 0;
      }
      return;
    }

    const tick = () => {
      const d = dragRef.current;
      const sc = scrollContainerRef.current;
      if (!d || d.phase !== 'dragging' || !sc) {
        autoScrollRef.current = 0;
        return;
      }

      const rect = sc.getBoundingClientRect();
      const edgeZone = 40;
      const { ghostX, ghostY } = d;

      let dx = 0;
      let dy = 0;

      // Horizontal
      if (ghostX < rect.left + edgeZone) {
        const dist = Math.max(1, rect.left + edgeZone - ghostX);
        dx = -Math.round(3 + (dist / edgeZone) * 5);
      } else if (ghostX > rect.right - edgeZone) {
        const dist = Math.max(1, ghostX - (rect.right - edgeZone));
        dx = Math.round(3 + (dist / edgeZone) * 5);
      }

      // Vertical
      if (ghostY < rect.top + edgeZone) {
        const dist = Math.max(1, rect.top + edgeZone - ghostY);
        dy = -Math.round(3 + (dist / edgeZone) * 5);
      } else if (ghostY > rect.bottom - edgeZone) {
        const dist = Math.max(1, ghostY - (rect.bottom - edgeZone));
        dy = Math.round(3 + (dist / edgeZone) * 5);
      }

      if (dx !== 0 || dy !== 0) {
        sc.scrollLeft += dx;
        sc.scrollTop += dy;
      }

      autoScrollRef.current = requestAnimationFrame(tick);
    };

    autoScrollRef.current = requestAnimationFrame(tick);

    return () => {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = 0;
      }
    };
  }, [dragActive]);

  // ============================================================
  // Drop preview — єдиний rAF loop (запускається один раз при mount)
  // Читає previewTarget з ref, ніяких React dependencies
  // ============================================================
  useEffect(() => {
    const lerpSpeed = 0.18;

    const tick = () => {
      const tgt = previewTarget.current;
      const cur = previewCurrent.current;
      const el = previewRef.current;

      if (!el) {
        previewAnimRef.current = requestAnimationFrame(tick);
        return;
      }

      if (!tgt.active) {
        el.style.opacity = '0';
        previewInitRef.current = false;
        previewAnimRef.current = requestAnimationFrame(tick);
        return;
      }

      // Перший кадр — стрибнути на target без інтерполяції
      if (!previewInitRef.current) {
        cur.x = tgt.x;
        cur.y = tgt.y;
        cur.h = tgt.h;
        previewInitRef.current = true;
        // Перший кадр — застосувати колір одразу
        previewColorRef.current = pendingColorRef.current;
      } else {
        cur.x += (tgt.x - cur.x) * lerpSpeed;
        cur.y += (tgt.y - cur.y) * lerpSpeed;
        cur.h += (tgt.h - cur.h) * lerpSpeed;
      }

      // Колір/label міняються тільки коли preview доїхав по X (< 4px)
      if (Math.abs(cur.x - tgt.x) < 4 && previewColorRef.current !== pendingColorRef.current) {
        previewColorRef.current = pendingColorRef.current;
        appliedColorRef.current = pendingColorRef.current;
        // Знайти ім'я ресурсу для ghost label
        const d = dragRef.current;
        if (d) {
          appliedResourceRef.current = d.targetResourceId;
          // Оновити ghost card/label з новим кольором/іменем (DOM)
          const gc = ghostCardRef.current;
          if (gc) {
            const cardInner = gc.querySelector('[data-ghost-card]') as HTMLElement;
            if (cardInner) cardInner.style.background = `linear-gradient(160deg, ${appliedColorRef.current} 0%, ${darkenColor(appliedColorRef.current, 15)} 100%)`;
          }
          const gl = ghostLabelRef.current;
          if (gl) {
            const labelText = gl.querySelector('[data-ghost-label]');
            if (labelText && d.mode === 'move') {
              // Шукаємо ім'я — через closure не маємо resources, беремо з DOM
              const headers = document.querySelectorAll('[data-resource-name]');
              const cols = Array.from(headers);
              const idx = cols.findIndex(el => (el as HTMLElement).dataset.resourceId === d.targetResourceId);
              appliedNameRef.current = idx >= 0 ? (cols[idx] as HTMLElement).textContent || '?' : '?';
              labelText.textContent = `→ ${appliedNameRef.current}`;
            }
          }
        }
      }

      // Ширина колонки — беремо з DOM
      const resContainer = gridRef.current?.querySelector('[data-resources]') as HTMLElement | null;
      const rc = resourcesCountRef.current || 1;
      const cw = resContainer ? resContainer.offsetWidth / rc : 110;
      el.style.width = `${cw}px`;
      el.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
      el.style.height = `${Math.max(24, cur.h)}px`;
      el.style.opacity = '1';
      el.style.backgroundColor = `${previewColorRef.current}30`;
      el.style.borderColor = previewColorRef.current;
      const label = el.querySelector('.preview-time-label') as HTMLElement;
      if (label) label.style.color = `${previewColorRef.current}cc`;

      previewAnimRef.current = requestAnimationFrame(tick);
    };

    previewAnimRef.current = requestAnimationFrame(tick);

    return () => {
      if (previewAnimRef.current) cancelAnimationFrame(previewAnimRef.current);
    };
  }, []); // Пустий deps — запускається ОДИН раз, працює вічно

  // ============================================================
  // Event click/tap — тільки якщо не було drag
  // ============================================================
  const handleEventClick = useCallback((event: CalendarEvent) => {
    // Невеликий таймаут щоб didDrag встиг оновитись
    setTimeout(() => {
      if (!didDrag.current) {
        // Якщо є зовнішній обробник — використовуємо його (EventModal в page.tsx)
        if (onEventClick) {
          onEventClick(event);
        } else {
          openEventModal(event);
        }
      }
      didDrag.current = false;
    }, 10);
  }, [onEventClick]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setInternalDate(startDate);
  }, [startDate]);

  // FLIP animation for cross-column move
  useEffect(() => {
    const pending = flipRef.current;
    if (!pending) return;

    const newEl = document.querySelector(`[data-event-id="${pending.eventId}"]`) as HTMLElement | null;
    if (!newEl) {
      setFlipHiddenId(null);
      flipRef.current = null;
      return;
    }

    const to = newEl.getBoundingClientRect();
    const from = pending.from;

    const clone = newEl.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.left = `${from.left}px`;
    clone.style.top = `${from.top}px`;
    clone.style.width = `${from.width}px`;
    clone.style.height = `${from.height}px`;
    clone.style.margin = '0';
    clone.style.transformOrigin = 'top left';
    clone.style.transform = 'translate3d(0,0,0)';
    clone.style.transition = 'none';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '200';
    clone.style.opacity = '1';

    document.body.appendChild(clone);

    const dx = to.left - from.left;
    const dy = to.top - from.top;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // translate3d для позиції (GPU, плавно)
        // width/height для розміру (без scale — текст не спотворюється)
        clone.style.transition = 'transform 300ms ease-out, width 300ms ease-out, height 300ms ease-out';
        clone.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        clone.style.width = `${to.width}px`;
        clone.style.height = `${to.height}px`;
      });
    });

    const cleanup = () => {
      // Показуємо реальну карточку (clone на z-200 перекриває)
      setFlipHiddenId(null);
      flipRef.current = null;
      // Видаляємо clone після React рендеру реальної карточки
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          clone.remove();
        });
      });
    };

    const t = window.setTimeout(cleanup, 320);
    return () => {
      window.clearTimeout(t);
      clone.remove();
    };
  }, [events]);

  // weekBar resize observer видалено — тепер в layout

  // Генеруємо кроки для сітки
  const totalMinutes = (dayEndHour - dayStartHour) * 60;
  const stepCount = Math.ceil(totalMinutes / timeStep);
  const steps = Array.from({ length: stepCount }, (_, i) => i);
  const pxPerHour = 112; // Height of one hour in pixels
  const stepHeight = pxPerHour * (timeStep / 60);

  // Отримуємо дні тижня для навігації
  const getWeekDays = (date: Date) => {
    const days = [];
    const current = new Date(date);
    const dayOfWeek = current.getDay();
    const monday = new Date(current);
    monday.setDate(current.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays(internalDate);
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  const isSelected = (date: Date) => date.toDateString() === internalDate.toDateString();
  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

  // selectedIdx та анімація видалені — тепер в WeekBar (layout)

  const handleDateSelect = (date: Date) => {
    setInternalDate(date);
    onDateChange?.(date);
  };

  // Working hours helper
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const getWorkingHoursForResource = (resourceId: string, date: Date): { startMin: number; endMin: number; enabled: boolean } | null => {
    const dayKey = dayNames[date.getDay()];
    // Master-specific first
    const masterWh = masterWorkingHours?.[resourceId]?.[dayKey];
    if (masterWh) return { startMin: parseInt(masterWh.start.split(':')[0]) * 60 + parseInt(masterWh.start.split(':')[1] || '0'), endMin: parseInt(masterWh.end.split(':')[0]) * 60 + parseInt(masterWh.end.split(':')[1] || '0'), enabled: masterWh.enabled };
    // Fallback to salon
    const salonWh = salonWorkingHours?.[dayKey as keyof typeof salonWorkingHours] as { start: string; end: string; enabled: boolean } | undefined;
    if (salonWh) return { startMin: parseInt(salonWh.start.split(':')[0]) * 60 + parseInt(salonWh.start.split(':')[1] || '0'), endMin: parseInt(salonWh.end.split(':')[0]) * 60 + parseInt(salonWh.end.split(':')[1] || '0'), enabled: salonWh.enabled };
    return null;
  };

  // Week view helpers
  const getWeekDaysArray = (date: Date) => {
    const days: Date[] = [];
    const current = new Date(date);
    const dow = current.getDay();
    const monday = new Date(current);
    monday.setDate(current.getDate() - (dow === 0 ? 6 : dow - 1));
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  };
  const weekViewDays = viewMode === 'week' ? getWeekDaysArray(internalDate) : [];
  const ukDaysShortWeek = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  // Фільтруємо події для поточної дати
  const dateStr = internalDate.toISOString().split('T')[0];
  const filteredEvents = effectiveEvents.filter((e: CalendarEvent) => e.start.startsWith(dateStr));

  // Розраховуємо позицію події
  const getEventPosition = (event: CalendarEvent) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const startMinutes = start.getHours() * 60 + start.getMinutes() - dayStartHour * 60;
    const endMinutes = end.getHours() * 60 + end.getMinutes() - dayStartHour * 60;
    const totalMinutes = (dayEndHour - dayStartHour) * 60;
    
        return {
      top: (startMinutes / totalMinutes) * 100,
      height: ((endMinutes - startMinutes) / totalMinutes) * 100,
    };
  };

  if (!mounted) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">Завантаження...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      
      {/* Десктопна навігація по тижню - поза скролом */}
      <div className="hidden lg:flex items-center justify-center gap-1 py-3 border-b border-gray-200 bg-gray-50">
          {weekDays.map((day, idx) => {
            const dayNum = day.getDate();
            const dayName = ukDaysShort[day.getDay()];
            const selected = isSelected(day);
            const weekend = isWeekend(day);
            const todayClass = isToday(day);
            
            return (
              <button
                key={idx}
                onClick={() => handleDateSelect(day)}
                className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all ${
                  selected 
                    ? 'bg-yellow-400 text-gray-900 shadow-md' 
                    : todayClass
                      ? 'bg-yellow-100 text-gray-900 hover:bg-yellow-200'
                      : 'hover:bg-gray-100'
                }`}
              >
                <span className={`text-xs font-medium ${
                  selected ? 'text-gray-900' : weekend ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {dayName}
                </span>
                <span className={`text-lg font-bold ${
                  selected ? 'text-gray-900' : weekend ? 'text-orange-600' : 'text-gray-800'
                }`}>
                  {dayNum}
                </span>
              </button>
            );
          })}
      </div>
        
      {/* Єдиний скрол-контейнер (header sticky top, нативний скрол, 60fps) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'week' ? (
          /* ====== WEEK VIEW ====== */
          <div className="h-full overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Week header */}
            <div className="flex border-b border-gray-200 bg-white sticky top-0 z-30" style={{ transform: 'translateZ(0)', willChange: 'transform' }}>
              <div className="w-10 lg:w-14 flex-shrink-0 border-r border-gray-300 py-2 sticky left-0 bg-white z-40" />
              <div className="flex flex-1">
                {weekViewDays.map((day, idx) => {
                  const isTodayCol = day.toDateString() === new Date().toDateString();
                  const isSelectedCol = day.toDateString() === internalDate.toDateString();
                  return (
                    <div 
                      key={idx} 
                      className={`flex-1 min-w-[100px] py-2 text-center border-r border-b border-gray-200 cursor-pointer ${isSelectedCol ? 'bg-gray-100' : 'bg-white'}`}
                      onClick={() => handleDateSelect(day)}
                    >
                      <div className={`text-[10px] font-medium ${isTodayCol ? 'text-red-500' : 'text-gray-500'}`}>
                        {ukDaysShortWeek[day.getDay()]}
                      </div>
                      <div className={`text-sm font-bold ${isTodayCol ? 'text-red-500' : 'text-gray-900'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Week grid */}
            <div className="relative flex" style={{ minHeight: `${totalMinutes}px` }}>
              {/* Time column */}
              <div
                className="w-10 lg:w-14 flex-shrink-0 border-r border-gray-200/60 sticky left-0 z-20"
                style={{
                  background: 'rgba(255,255,255,0.72)',
                  backdropFilter: 'saturate(180%) blur(20px)',
                  WebkitBackdropFilter: 'saturate(180%) blur(20px)',
                }}
              >
                {steps.map((i) => {
                  const minutesFromStart = i * timeStep;
                  const absoluteMin = dayStartHour * 60 + minutesFromStart;
                  const h = Math.floor(absoluteMin / 60);
                  const m = absoluteMin % 60;
                  const isHour = m === 0;
                  const isHalf = m === 30;
                  const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                  return (
                    <div key={i} className="relative" style={{ height: `${stepHeight}px` }}>
                      {(isHour || isHalf) && (
                        <span className={`absolute right-1 ${isHalf ? 'text-[7px] lg:text-[9px] opacity-60' : 'text-[9px] lg:text-xs font-medium'} text-gray-900`} style={{ top: '100%', transform: 'translateY(-50%)' }}>
                          {label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Day columns */}
              <div className="flex flex-1">
                {weekViewDays.map((day, dIdx) => {
                  const dayStr = day.toISOString().split('T')[0];
                  const dayEvents = effectiveEvents.filter((e: CalendarEvent) => e.start.startsWith(dayStr));
                  const isTodayCol = day.toDateString() === new Date().toDateString();
                  return (
                    <div key={dIdx} className={`flex-1 min-w-[100px] relative border-r border-gray-200 ${isTodayCol ? 'bg-yellow-50/30' : 'bg-white'}`}>
                      {/* Hour lines */}
                      {steps.map((i) => {
                        const minutesFromStart = i * timeStep;
                        const absoluteMin = dayStartHour * 60 + minutesFromStart;
                        const isHour = absoluteMin % 60 === 0;
                        return <div key={i} className={`border-b ${isHour ? 'border-gray-300' : 'border-gray-200'}`} style={{ height: `${stepHeight}px` }} />;
                      })}
                      {/* Events */}
                      {dayEvents.map(event => {
                        const pos = getEventPosition(event);
                        const bgColor = event.backColor || resources.find(r => r.id === event.resource)?.color || '#22c55e';
                        return (
                          <div
                            key={event.id}
                            data-event-id={event.id}
                            className="absolute left-0.5 right-0.5 overflow-hidden cursor-pointer z-10"
                            style={{
                              top: `${pos.top}%`,
                              height: `${pos.height}%`,
                              backgroundColor: tintColor(bgColor, 10),
                              borderLeft: `2px solid ${bgColor}`,
                              borderRadius: '0 4px 4px 0',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                            }}
                            onClick={() => onEventClick?.(event)}
                          >
                            {/* Time bar — solid */}
                            <div className="px-1.5 flex items-center gap-0.5" style={{ backgroundColor: bgColor, height: '18px' }}>
                              <span className="text-[10px] font-bold text-white leading-none">{formatTime(event.start)} – {formatTime(event.end)}</span>
                              <svg className="w-2 h-2 text-white/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
                              </svg>
                              {/* Status badge */}
                              {event.status === 'completed' && (
                                <span
                                  className="ml-auto px-1 py-px text-[7px] font-bold rounded bg-green-500 text-white leading-tight whitespace-nowrap cursor-pointer hover:bg-green-600 transition-colors"
                                  onClick={(e) => onEventStatusChange && openStatusDropdown(event.id, e)}
                                >Виконано</span>
                              )}
                              {event.status === 'cancelled' && (
                                <span
                                  className="ml-auto px-1 py-px text-[7px] font-bold rounded bg-red-500 text-white leading-tight whitespace-nowrap cursor-pointer hover:bg-red-600 transition-colors"
                                  onClick={(e) => onEventStatusChange && openStatusDropdown(event.id, e)}
                                >Відміна</span>
                              )}
                              {event.status === 'no_show' && (
                                <span
                                  className="ml-auto px-1 py-px text-[7px] font-bold rounded bg-yellow-500 text-white leading-tight whitespace-nowrap cursor-pointer hover:bg-yellow-600 transition-colors"
                                  onClick={(e) => onEventStatusChange && openStatusDropdown(event.id, e)}
                                >Не прийшов</span>
                              )}
                              {event.status === 'confirmed' && onEventStatusChange && (
                                <span
                                  className="ml-auto px-1 py-px text-[7px] font-bold rounded bg-white/30 text-white leading-tight whitespace-nowrap cursor-pointer hover:bg-white/50 transition-colors"
                                  onClick={(e) => openStatusDropdown(event.id, e)}
                                >•••</span>
                              )}
                            </div>
                            <div className="px-1.5 py-0.5">
                              <div className="text-xs font-bold text-gray-900 truncate">{event.clientName || event.text}</div>
                              <div className="text-[10px] text-gray-500 truncate">{event.serviceName || ''}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="h-[110px] lg:h-0 shrink-0" />
          </div>
        ) : (
        <div ref={scrollContainerRef} className="h-full overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Заголовки ресурсів — sticky top, скролиться разом з grid */}
          {!hideResourceHeader && (
          <div className="flex border-b border-gray-200 bg-white sticky top-0 z-30" style={{ minWidth: resources.length > 3 ? `${40 + resources.length * 120}px` : '100%', transform: 'translateZ(0)', willChange: 'transform' }}>
            {/* Колонка часу - заголовок */}
            <div className={`${columnMinWidth === 0 ? 'w-11' : 'w-10'} lg:w-14 flex-shrink-0 border-r border-gray-300 py-2 sticky left-0 bg-white z-40`}>
            </div>
            
            <div className="flex flex-1" style={{ minWidth: resources.length > 3 ? `${resources.length * 120}px` : undefined }}>
              {resources.map((r, idx) => (
                <div
                  key={r.id}
                  className={`flex-1 py-2 text-center ${idx < resources.length - 1 ? 'border-r border-gray-300' : ''}`}
                  style={{ minWidth: `${columnMinWidth}px` }}
                >
                  {r.avatar ? (
                    <img
                      src={r.avatar}
                      alt={r.name}
                      className="w-9 h-9 mx-auto rounded-lg object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 mx-auto rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
                      style={{ backgroundColor: r.color || '#9ca3af' }}
                    >
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-[10px] font-medium text-gray-700 mt-1 truncate px-0.5" data-resource-name data-resource-id={r.id}>{r.name}</div>
                </div>
              ))}
            </div>
          </div>
          )}
          {/* Сітка часу */}
          <div ref={gridRef} className="relative flex select-none" style={{ minHeight: `${totalMinutes}px`, minWidth: resources.length > 3 ? `${40 + resources.length * 120}px` : '100%', WebkitUserSelect: 'none', userSelect: 'none' }}>
            {/* Колонка часу — sticky left */}
            <div
              className={`${columnMinWidth === 0 ? 'w-11' : 'w-10'} lg:w-14 flex-shrink-0 border-r border-gray-200/60 sticky left-0 z-20`}
              style={{
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'saturate(180%) blur(20px)',
                WebkitBackdropFilter: 'saturate(180%) blur(20px)',
              }}
            >
              {steps.map((i) => {
                const minutesFromStart = i * timeStep;
                const absoluteMin = dayStartHour * 60 + minutesFromStart;
                const h = Math.floor(absoluteMin / 60);
                const m = absoluteMin % 60;
                const isHour = m === 0;
                const isHalf = m === 30;
                const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

                return (
                  <div key={i} className="relative" style={{ height: `${stepHeight}px` }}>
                    {(isHour || isHalf) && (
                      <span
                        className={`absolute right-1 ${
                          columnMinWidth === 0
                            ? (isHalf ? 'text-[10px] opacity-60' : 'text-sm font-medium')
                            : (isHalf ? 'text-[7px] lg:text-[9px] opacity-60' : 'text-[9px] lg:text-xs font-medium')
                        } text-gray-900`}
                        style={{ top: 0, transform: i === 0 ? 'none' : 'translateY(-50%)' }}
                      >
                        {label}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Червоний бейдж поточного часу — текст вирівняний зі стандартними лейблами */}
              {isToday_ && nowMinutes !== null && nowMinutes >= dayStartHour * 60 && nowMinutes <= dayEndHour * 60 && (
                <span
                  className={`absolute right-0 z-30 pointer-events-none font-bold bg-red-500 text-white pr-1 pl-[3px] py-[1px] rounded-l-[3px] ${columnMinWidth === 0 ? 'text-sm' : 'text-[9px] lg:text-xs'}`}
                  style={{
                    top: `${((nowMinutes - dayStartHour * 60) / totalMinutes) * 100}%`,
                    transform: 'translateY(-50%)',
                  }}
                >
                  {nowTimeStr}
                </span>
              )}
            </div>

            {/* Колонки ресурсів */}
            <div
              data-resources
              className={`flex relative ${resources.length <= 3 && columnMinWidth === 0 ? 'flex-1' : ''}`}
              style={{ minWidth: resources.length > 3 ? `${resources.length * 120}px` : (columnMinWidth === 0 ? undefined : '100%') }}
              onTouchStart={handleEmptyTouchStart}
              onClick={(e) => {
                if (!onEmptySlotMenu) return;
                const target = e.target as HTMLElement;
                if (target.closest('[data-event-id]')) return;
                // Не відкривати меню якщо тільки що був drag
                if (didDrag.current) { didDrag.current = false; return; }
                const pos = getGridPosition(e.clientX, e.clientY);
                // Calculate cell rect for centering
                let cellRect: { top: number; left: number; width: number; height: number } | undefined;
                if (pos) {
                  const resContainer = (e.currentTarget as HTMLElement);
                  const colEls = resContainer.children;
                  const resIdx = resources.findIndex(r => r.id === pos.resourceId);
                  const colEl = resIdx >= 0 ? colEls[resIdx] as HTMLElement : null;
                  if (colEl) {
                    const colRect = colEl.getBoundingClientRect();
                    const totalMin = (dayEndHour - dayStartHour) * 60;
                    const relMin = pos.startMin - dayStartHour * 60;
                    const step = timeStep || 15;
                    const cellTop = colRect.top + (relMin / totalMin) * colRect.height;
                    const cellH = (step / totalMin) * colRect.height;
                    cellRect = { top: cellTop, left: colRect.left, width: colRect.width, height: cellH };
                  }
                }
                onEmptySlotMenu(e.clientX, e.clientY, {
                  startMin: pos?.startMin ?? dayStartHour * 60,
                  resourceId: pos?.resourceId ?? '',
                  cellRect,
                  scrollEl: scrollContainerRef.current || undefined,
                });
              }}
            >
            {resources.map((r, rIdx) => (
              <div
                key={r.id}
                className={`flex-1 relative ${rIdx < resources.length - 1 ? 'border-r border-gray-300' : ''}`}
                style={{ minWidth: `${columnMinWidth}px`, backgroundColor: `${r.color}18` }}
              >
              {/* Working hours shading */}
              {(() => {
                const wh = getWorkingHoursForResource(r.id, internalDate);
                if (!wh) return null;
                if (!wh.enabled) {
                  return <div className="absolute inset-0 bg-gray-200/60 z-[1] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 8px)' }} />;
                }
                const gridStartMin = dayStartHour * 60;
                const gridEndMin = dayEndHour * 60;
                const beforePct = Math.max(0, ((wh.startMin - gridStartMin + timeStep) / totalMinutes) * 100);
                const afterPct = Math.max(0, ((gridEndMin - wh.endMin) / totalMinutes) * 100);
                return (
                  <>
                    {beforePct > 0 && <div className="absolute left-0 right-0 top-0 bg-gray-200/50 z-[1] pointer-events-none" style={{ height: `${beforePct}%` }} />}
                    {afterPct > 0 && <div className="absolute left-0 right-0 bottom-0 bg-gray-200/50 z-[1] pointer-events-none" style={{ height: `${afterPct}%` }} />}
                  </>
                );
              })()}
              {/* Лінії годин */}
              {steps.map((i) => {
                const minutesFromStart = i * timeStep;
                const absoluteMin = dayStartHour * 60 + minutesFromStart;
                const isHour = absoluteMin % 60 === 0;
                return (
                  <div
                    key={i}
                    className={`border-b ${isHour ? 'border-gray-300' : 'border-gray-200'}`}
                    style={{ height: `${stepHeight}px` }}
                  />
                );
              })}

              {/* Події */}
              {filteredEvents
                .filter(e => e.resource === r.id)
                .map(event => {
                  const pos = getEventPosition(event);
                  const bgColor = event.backColor || r.color || '#22c55e';
                  const borderColor = darkenColor(bgColor, 25);
                  const isBeingDragged = dragActive?.eventId === event.id;
                  // Past event: completed or end time passed
                  const nowMs = Date.now();
                  const eventEndMs = new Date(event.end).getTime();
                  const isPastEvent = event.status === 'COMPLETED' || eventEndMs < nowMs;
                  return (
                    <div
                      key={event.id}
                      data-event-id={event.id}
                      className={`absolute left-0 right-0.5 overflow-hidden select-none ${
                        isBeingDragged ? 'opacity-30 scale-95' : 'cursor-grab active:scale-[0.98]'
                      }`}
                      style={{
                        top: `${pos.top}%`,
                        height: `${pos.height}%`,
                        minHeight: '36px',
                        opacity: isBeingDragged ? 0.3 : flipHiddenId === event.id ? 0 : 1,
                        transition: flipHiddenId === event.id
                          ? 'none'
                          : 'transform 300ms ease-out, top 300ms ease-out, height 300ms ease-out',
                        backgroundColor: tintColor(bgColor, 10),
                        backgroundImage: isPastEvent
                          ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 8px)'
                          : undefined,
                        borderLeft: `4px solid ${bgColor}`,
                        border: `1px solid ${borderColor}`,
                        borderLeftWidth: '4px',
                        borderRadius: '0 6px 6px 0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                        WebkitTouchCallout: 'none',
                      } as React.CSSProperties}
                      onClick={() => handleEventClick(event)}
                      onContextMenu={(e) => e.preventDefault()}
                      onTouchStart={(e) => handleTouchStart(event, e)}
                      onMouseDown={(e) => handleMouseDown(event, e)}
                    >
                      {/* Resize handle top */}
                      <div className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize z-10 lg:hover:bg-black/5 transition-colors">
                        <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full" style={{ backgroundColor: `${bgColor}40` }} />
                      </div>
                      
                      <div className="h-full relative flex flex-col pointer-events-none">
                        {/* Time bar — solid background, same color as border */}
                        <div className="px-1.5 flex items-center gap-1 flex-shrink-0" style={{ backgroundColor: borderColor, height: '20px' }}>
                          <span className="text-[11px] font-bold text-white leading-none">{formatTime(event.start)} – {formatTime(event.end)}</span>
                          <svg className="w-[10px] h-[10px] text-white/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
                          </svg>
                          {/* Status badge — text (clickable for status change) */}
                          {event.status === 'completed' && (
                            <span
                              className="ml-auto px-1.5 py-px text-[8px] font-bold rounded bg-green-500 text-white leading-tight whitespace-nowrap cursor-pointer hover:bg-green-600 transition-colors pointer-events-auto"
                              onClick={(e) => onEventStatusChange && openStatusDropdown(event.id, e)}
                            >Виконано</span>
                          )}
                          {event.status === 'cancelled' && (
                            <span
                              className="ml-auto px-1.5 py-px text-[8px] font-bold rounded bg-red-500 text-white leading-tight whitespace-nowrap cursor-pointer hover:bg-red-600 transition-colors pointer-events-auto"
                              onClick={(e) => onEventStatusChange && openStatusDropdown(event.id, e)}
                            >Відміна</span>
                          )}
                          {event.status === 'no_show' && (
                            <span
                              className="ml-auto px-1.5 py-px text-[8px] font-bold rounded bg-yellow-500 text-white leading-tight whitespace-nowrap cursor-pointer hover:bg-yellow-600 transition-colors pointer-events-auto"
                              onClick={(e) => onEventStatusChange && openStatusDropdown(event.id, e)}
                            >Не прийшов</span>
                          )}
                          {event.status === 'confirmed' && onEventStatusChange && (
                            <span
                              className="ml-auto px-1.5 py-px text-[8px] font-bold rounded bg-white/30 text-white leading-tight whitespace-nowrap cursor-pointer hover:bg-white/50 transition-colors pointer-events-auto"
                              onClick={(e) => openStatusDropdown(event.id, e)}
                            >•••</span>
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="px-1.5 py-0.5 flex-1 min-h-0">
                          {/* Client name */}
                          <div className="text-sm font-bold leading-tight truncate text-gray-900">
                            {event.clientName || event.text}
                          </div>
                          
                          {/* Service */}
                          {event.serviceName && (
                            <div className="text-[11px] text-gray-500 leading-tight truncate">{event.serviceName}</div>
                          )}
                          
                          {/* Duration + Price */}
                          {(event.duration || event.price) && (
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                              {event.duration && <span className="text-[10px] text-gray-400">{event.duration} хв</span>}
                              {event.price !== undefined && event.price > 0 && <span className="text-[11px] font-bold text-gray-700">{event.price} ₴</span>}
                            </div>
                          )}
                          
                          {/* NEW client badge */}
                          {event.isNewClient && (
                            <div className="mt-0.5">
                              <span className="px-1 py-px text-[7px] font-bold rounded uppercase" style={{ backgroundColor: `${bgColor}25`, color: bgColor }}>
                                new
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Resize handle bottom */}
                      <div className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize z-10 lg:hover:bg-black/5 transition-colors">
                        <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full" style={{ backgroundColor: `${bgColor}40` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
          </div>{/* end resource columns flex */}

          {/* Drop Preview — OVERLAY поверх усього gridRef, не всередині data-resources */}
          <div
            ref={previewRef}
            className="absolute pointer-events-none overflow-hidden z-[2]"
            style={{
              top: 0,
              left: 0,
              width: '110px',
              height: '24px',
              opacity: 0,
              border: '2px dashed #666',
              borderRadius: '0.5rem',
              willChange: 'transform',
              transition: 'background-color 150ms ease, border-color 150ms ease',
            }}
          >
            <div className="px-1.5 py-1 text-[10px] font-semibold preview-time-label" style={{ transition: 'color 150ms ease' }} />
          </div>

          {/* Червона лінія поточного часу — від границі колонки годин до кінця */}
          {isToday_ && nowMinutes !== null && nowMinutes >= dayStartHour * 60 && nowMinutes <= dayEndHour * 60 && (
            <div
              className={`absolute h-[2px] bg-red-500 pointer-events-none z-[3] ${columnMinWidth === 0 ? 'left-11' : 'left-10 lg:left-14'} right-0`}
              style={{
                top: `${((nowMinutes - dayStartHour * 60) / totalMinutes) * 100}%`,
                transform: 'translateY(-50%)',
              }}
            />
          )}

          {/* Time indicator line — static DOM, позиція через ref */}
          <div
            ref={timeLineRef}
            className="absolute pointer-events-none z-[25]"
            style={{ top: 0, left: 0, opacity: 0, width: resources.length > 3 ? `${40 + resources.length * 120}px` : '100%' }}
          >
            <div className="absolute left-0 right-0 h-[2px] bg-black/50" />
            <div
              ref={timeLineBadgeRef}
              className="absolute bg-black text-white rounded px-1.5 py-0.5 text-[9px] font-bold leading-tight whitespace-nowrap"
              style={{ left: 0, top: '-10px' }}
            />
          </div>
        </div>
        
        {/* Кінець робочого дня */}
        <div className="sticky left-0 flex items-center justify-center py-3 lg:pb-4 text-gray-400" style={{ width: '100vw', maxWidth: '100%' }}>
          <span className="text-sm">Робота закінчилась, час додому ❤️</span>
        </div>
        {/* Spacer для скролу під WeekBar + MobileNav */}
        <div className={`${columnMinWidth === 0 ? 'h-3' : 'h-[110px]'} lg:h-0 shrink-0`} />
      </div>
        )}
      </div>

      {/* Ghost card — static DOM, позиція через ref */}
      <div
        ref={ghostCardRef}
        className="fixed z-[90] pointer-events-none select-none"
        style={{ opacity: 0, top: 0, left: 0, willChange: 'transform' }}
      >
        <div data-ghost-card className="w-[140px] rounded-xl px-3 py-2 text-white text-[11px] font-semibold shadow-2xl bg-gray-600" style={{ opacity: 0.95, transition: 'background 200ms ease' }}>
          <div className="font-bold text-[12px]" data-ghost-time />
          <div className="truncate opacity-90" data-ghost-name />
        </div>
      </div>

      {/* Ghost label — static DOM, позиція через ref */}
      <div
        ref={ghostLabelRef}
        className="fixed z-[90] pointer-events-none select-none"
        style={{ opacity: 0, top: 0, left: 0, willChange: 'transform' }}
      >
        <div className="text-center text-[11px] text-gray-700 bg-white/95 rounded-lg px-3 py-1 shadow-md font-semibold" data-ghost-label />
      </div>

      {/* Модалка деталей запису */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          modalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeModal}
      />
      <div 
        className={`fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-[101] transform transition-transform duration-300 ease-out max-h-[85vh] overflow-hidden ${
          modalOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {selectedEvent && (() => {
          const master = getResourceById(selectedEvent.resource);
          const masterColor = master?.color || '#8b5cf6';
          return (
            <>
              {/* Заголовок */}
              <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
                <h2 className="font-semibold text-lg">Деталі запису</h2>
                <button 
                  onClick={closeModal}
                  className="h-9 w-9 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto">
                {/* Картка запису */}
                <div className="rounded-2xl p-4" style={{ backgroundColor: `${masterColor}15`, borderLeft: `4px solid ${masterColor}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4" style={{ color: masterColor }} />
                    <span className="font-bold text-lg">{formatTime(selectedEvent.start)} — {formatTime(selectedEvent.end)}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{selectedEvent.clientName}</span>
                      {selectedEvent.isNewClient && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full uppercase">
                          новий
                        </span>
                      )}
                    </div>
                    
                    {selectedEvent.serviceName && (
                      <div className="flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{selectedEvent.serviceName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Картка майстра */}
                {master && (
                  <div className="rounded-2xl border p-4">
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Майстер</p>
                    <div className="flex items-center gap-3">
                      {master.avatar ? (
                        <img src={master.avatar} alt={master.name} className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                          style={{ backgroundColor: masterColor }}
                        >
                          {master.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-lg">{master.name}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Картка клієнта */}
                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Клієнт</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg">
                        {selectedEvent.clientName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{selectedEvent.clientName}</p>
                        {selectedEvent.clientPhone && (
                          <p className="text-sm text-gray-500">{selectedEvent.clientPhone}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Кнопки зв'язку */}
                    {selectedEvent.clientPhone && (
                      <div className="flex gap-2">
                        <a
                          href={`tel:${selectedEvent.clientPhone}`}
                          className="h-11 w-11 rounded-xl bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
                        >
                          <Phone className="h-5 w-5" />
                        </a>
                        <a
                          href={`https://t.me/${selectedEvent.clientPhone?.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-11 w-11 rounded-xl bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors"
                        >
                          <MessageCircle className="h-5 w-5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Status change dropdown */}
      {statusDropdown && (
        <div
          ref={statusDropdownRef}
          className="fixed z-[200] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
          style={{
            left: `${Math.min(statusDropdown.x, window.innerWidth - 160)}px`,
            top: `${Math.min(statusDropdown.y, window.innerHeight - 140)}px`,
            minWidth: '140px',
            transform: statusDropdownVisible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.95)',
            opacity: statusDropdownVisible ? 1 : 0,
            transition: 'transform 0.2s ease, opacity 0.2s ease',
          }}
        >
          <button
            className="w-full px-3 py-2.5 text-left text-sm font-medium flex items-center gap-2 hover:bg-green-50 transition-colors"
            onClick={() => handleStatusSelect(statusDropdown.eventId, 'completed')}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
            Виконано
          </button>
          <button
            className="w-full px-3 py-2.5 text-left text-sm font-medium flex items-center gap-2 hover:bg-yellow-50 transition-colors"
            onClick={() => handleStatusSelect(statusDropdown.eventId, 'no_show')}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0" />
            Не прийшов
          </button>
          <button
            className="w-full px-3 py-2.5 text-left text-sm font-medium flex items-center gap-2 hover:bg-red-50 transition-colors"
            onClick={() => handleStatusSelect(statusDropdown.eventId, 'cancelled')}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
            Відміна
          </button>
        </div>
      )}

      {/* FAB - кнопка додавання запису */}
    </div>
  );
}
