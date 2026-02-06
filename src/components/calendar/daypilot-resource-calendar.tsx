'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, Phone, MessageCircle, User, Clock, Scissors } from 'lucide-react';

export interface CalendarEvent {
  id: string;
  text: string;
  start: string;
  end: string;
  resource: string;
  backColor?: string;
  barColor?: string;
  clientName?: string;
  clientPhone?: string;
  serviceName?: string;
  isNewClient?: boolean;
  status?: string;
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
  dayStartHour?: number;
  dayEndHour?: number;
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
  targetResourceId: string;
  targetStartMin: number;
  targetEndMin: number;
  phase: 'pending' | 'dragging';
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
  dayStartHour = 8,
  dayEndHour = 21,
}: DayPilotResourceCalendarProps) {
  const [internalDate, setInternalDate] = useState(startDate);
  const [mounted, setMounted] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Drag & drop + resize state
  const dragRef = useRef<DragState | null>(null);
  const [dragRender, setDragRender] = useState<DragState | null>(null);

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

  // Drop preview — rAF інтерполяція (запускається один раз, читає з refs)
  const previewRef = useRef<HTMLDivElement>(null);
  const previewTarget = useRef({ x: 0, y: 0, h: 0, active: false });
  const previewCurrent = useRef({ x: 0, y: 0, h: 0 });
  const previewAnimRef = useRef<number>(0);
  const previewColorRef = useRef<string>('#666');
  const previewInitRef = useRef(false);

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
    const cellW = resourcesContainer.offsetWidth / resources.length;
    const resourceIdx = Math.max(0, Math.min(resources.length - 1, Math.floor(relX / cellW)));
    const resourceId = resources[resourceIdx]?.id || '';

    // Розрахунок часу — grid height = hours.length * 60px
    const totalMinutes = (dayEndHour - dayStartHour) * 60;
    const gridHeight = resourcesContainer.offsetHeight;
    // relY може бути від'ємним якщо курсор над grid — clamp
    const clampedY = Math.max(0, Math.min(gridHeight, relY));
    const minutes = Math.round((clampedY / gridHeight) * totalMinutes / 15) * 15; // snap to 15min
    const startMin = dayStartHour * 60 + Math.max(0, Math.min(totalMinutes - 15, minutes));

    return { resourceId, startMin, resourceIdx };
  }, [resources, dayStartHour, dayEndHour]);

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

  // Оновити preview target напряму (без React re-render)
  const updatePreviewTarget = useCallback(() => {
    const d = dragRef.current;
    if (!d || d.phase !== 'dragging') {
      previewTarget.current.active = false;
      return;
    }
    const totalMinutes = (dayEndHour - dayStartHour) * 60;
    const previewStartMin = d.targetStartMin - dayStartHour * 60;
    const previewEndMin = d.targetEndMin - dayStartHour * 60;
    const container = gridRef.current?.querySelector('[data-resources]') as HTMLElement;
    if (!container) return;
    const cW = container.offsetWidth;
    const cH = container.offsetHeight;
    const colIdx = resources.findIndex(r => r.id === d.targetResourceId);
    
    previewTarget.current = {
      x: (colIdx / resources.length) * cW,
      y: (previewStartMin / totalMinutes) * cH,
      h: ((previewEndMin - previewStartMin) / totalMinutes) * cH,
      active: true,
    };
    previewColorRef.current = resources[colIdx]?.color || '#666';
  }, [resources, dayStartHour, dayEndHour]);

  const startDrag = useCallback((event: CalendarEvent, mode: InteractionMode, clientX: number, clientY: number) => {
    if (isPastDate()) return; // Заборона drag на минулих датах
    didDrag.current = true;
    if (navigator.vibrate) { try { navigator.vibrate(50); } catch {} }
    lockScroll();
    document.body.style.cursor = mode === 'move' ? 'grabbing' : 'ns-resize';

    const pos = getGridPosition(clientX, clientY);
    const { startMin, endMin } = getEventMinutes(event);

    const state: DragState = {
      event,
      mode,
      ghostX: clientX,
      ghostY: clientY,
      targetResourceId: pos?.resourceId || event.resource,
      targetStartMin: mode === 'move' ? (pos?.startMin || startMin) : startMin,
      targetEndMin: mode === 'move' ? (pos?.startMin || startMin) + (endMin - startMin) : endMin,
      phase: 'dragging',
    };

    // Для resize встановлюємо правильні початкові значення
    if (mode === 'resize-top') {
      state.targetStartMin = pos?.startMin || startMin;
      state.targetEndMin = endMin;
    } else if (mode === 'resize-bottom') {
      state.targetStartMin = startMin;
      state.targetEndMin = pos?.startMin ? pos.startMin + 15 : endMin;
    }

    dragRef.current = state;
    // Скинути інтерполяцію preview і встановити initial target
    previewInitRef.current = false;
    updatePreviewTarget();
    setDragRender({ ...state });
  }, [getGridPosition, getEventMinutes, lockScroll, isPastDate, updatePreviewTarget]);

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
      d.targetStartMin = pos.startMin;
      d.targetEndMin = pos.startMin + duration;
    } else if (d.mode === 'resize-top') {
      d.targetStartMin = Math.min(pos.startMin, d.targetEndMin - 15);
    } else if (d.mode === 'resize-bottom') {
      d.targetEndMin = Math.max(pos.startMin + 15, d.targetStartMin + 15);
    }

    // Оновити preview target напряму (без setState!)
    updatePreviewTarget();

    setDragRender({ ...d });
  }, [getGridPosition, updatePreviewTarget]);

  const endDrag = useCallback((commit: boolean) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const state = dragRef.current;
    if (state && state.phase === 'dragging' && commit) {
      const dStr = internalDate.toISOString().split('T')[0];
      const makeDate = (min: number) => {
        const h = Math.floor(min / 60);
        const m = min % 60;
        return new Date(`${dStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
      };

      if (state.mode === 'move' && onEventMove) {
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
    setDragRender(null);
  }, [internalDate, onEventMove, onEventResize, unlockScroll]);

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
      if (dragRef.current && dragRef.current.phase === 'dragging') {
        endDrag(true);
      } else {
        dragRef.current = null;
        setDragRender(null);
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
    if (!dragRender || dragRender.phase !== 'dragging') {
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
  }, [dragRender]);

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
      } else {
        cur.x += (tgt.x - cur.x) * lerpSpeed;
        cur.y += (tgt.y - cur.y) * lerpSpeed;
        cur.h += (tgt.h - cur.h) * lerpSpeed;
      }

      el.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
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
        openEventModal(event);
      }
      didDrag.current = false;
    }, 10);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setInternalDate(startDate);
  }, [startDate]);

  // weekBar resize observer видалено — тепер в layout

  // Генеруємо години для сітки
  const hours: number[] = [];
  for (let h = dayStartHour; h < dayEndHour; h++) {
    hours.push(h);
  }

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

  // Фільтруємо події для поточної дати
  const dateStr = internalDate.toISOString().split('T')[0];
  const filteredEvents = events.filter(e => e.start.startsWith(dateStr));

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
        
      {/* Горизонтальний скрол-контейнер для заголовків + сітки */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Заголовки ресурсів — sticky top, горизонтальний скрол синхронний */}
        <div className="flex border-b border-gray-200 bg-white shrink-0 overflow-x-auto scrollbar-hide" 
          onScroll={(e) => {
            const grid = e.currentTarget.nextElementSibling as HTMLElement;
            if (grid) grid.scrollLeft = e.currentTarget.scrollLeft;
          }}
        >
          {/* Колонка часу - заголовок */}
          <div className="w-10 lg:w-14 flex-shrink-0 border-r border-gray-300 py-2 sticky left-0 bg-white/50 backdrop-blur-lg z-20">
          </div>
          
          <div className="flex" style={{ minWidth: resources.length > 3 ? `${resources.length * 110}px` : '100%' }}>
            {resources.map((r, idx) => (
              <div
                key={r.id}
                className={`flex-1 min-w-[110px] py-2 text-center ${idx < resources.length - 1 ? 'border-r border-gray-300' : ''}`}
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
                <div className="text-[10px] font-medium text-gray-700 mt-1 truncate px-0.5">{r.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Скрол контейнер (вертикальний + горизонтальний) */}
        <div ref={scrollContainerRef} className="flex-1 overflow-auto"
          onScroll={(e) => {
            const headers = e.currentTarget.previousElementSibling as HTMLElement;
            if (headers) headers.scrollLeft = e.currentTarget.scrollLeft;
          }}
        >
          {/* Сітка часу */}
          <div ref={gridRef} className="relative flex select-none" style={{ minHeight: `${hours.length * 60}px`, minWidth: resources.length > 3 ? `${40 + resources.length * 110}px` : '100%', WebkitUserSelect: 'none', userSelect: 'none' }}>
            {/* Колонка часу — sticky left */}
            <div className="w-10 lg:w-14 flex-shrink-0 border-r border-gray-300 sticky left-0 bg-white/50 backdrop-blur-lg z-20">
              {hours.map(hour => (
                <div
                  key={hour}
                  className="h-[60px] flex items-start justify-end pr-1 pt-0"
                >
                  <span className="text-[9px] lg:text-xs text-gray-900 font-medium">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Колонки ресурсів */}
            <div data-resources className="flex relative" style={{ minWidth: resources.length > 3 ? `${resources.length * 110}px` : '100%' }}>
            {/* Drop Preview — позиція через rAF lerp (обхід React для гладкості) */}
            <div
              ref={previewRef}
              className="absolute z-[1] pointer-events-none overflow-hidden"
              style={{
                top: 0,
                left: 0,
                width: `${100 / resources.length}%`,
                height: '24px',
                opacity: 0,
                border: '2px dashed #666',
                borderRadius: '0 0.5rem 0.5rem 0',
                willChange: 'transform',
              }}
            >
              {dragRender && dragRender.phase === 'dragging' && (
                <div className="px-1.5 py-1 text-[10px] font-semibold preview-time-label">
                  {formatMinutes(dragRender.targetStartMin)} – {formatMinutes(dragRender.targetEndMin)}
                </div>
              )}
            </div>

            {resources.map((r, rIdx) => (
              <div
                key={r.id}
                className={`flex-1 min-w-[110px] relative ${rIdx < resources.length - 1 ? 'border-r border-gray-300' : ''}`}
                style={{ backgroundColor: `${r.color}18` }}
              >
              {/* Лінії годин */}
              {hours.map(hour => (
                <div key={hour} className="h-[60px] border-b border-gray-200" />
              ))}

              {/* Події */}
              {filteredEvents
                .filter(e => e.resource === r.id)
                .map(event => {
                  const pos = getEventPosition(event);
                  const bgColor = event.backColor || r.color || '#22c55e';
                  const borderColor = darkenColor(bgColor, 25);
                  const isBeingDragged = dragRender?.event.id === event.id;
                  return (
                    <div
                      key={event.id}
                      className={`absolute left-0 right-0.5 rounded-r-lg overflow-hidden select-none transition-all duration-300 ease-out ${
                        isBeingDragged ? 'opacity-30 scale-95' : 'cursor-grab active:scale-[0.98]'
                      }`}
                      style={{
                        top: `${pos.top}%`,
                        height: `${pos.height}%`,
                        minHeight: '36px',
                        background: `linear-gradient(160deg, ${bgColor} 0%, ${bgColor}e0 100%)`,
                        boxShadow: `0 1px 4px ${bgColor}50, 0 2px 6px rgba(0,0,0,0.08)`,
                        borderLeft: `3px solid ${borderColor}`,
                        borderTop: `1px solid ${borderColor}`,
                        borderRight: `1px solid ${borderColor}`,
                        borderBottom: `1px solid ${borderColor}`,
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                        WebkitTouchCallout: 'none',
                      } as React.CSSProperties}
                      onClick={() => handleEventClick(event)}
                      onContextMenu={(e) => e.preventDefault()}
                      onTouchStart={(e) => handleTouchStart(event, e)}
                      onMouseDown={(e) => handleMouseDown(event, e)}
                    >
                      {/* Resize handle top — desktop only visible, mobile через long press */}
                      <div className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize z-10 lg:hover:bg-white/20 transition-colors" />
                      
                      <div className="h-full p-1.5 text-white relative flex flex-col justify-center pointer-events-none">
                        {/* Час */}
                        <div className="text-[10px] font-bold leading-tight opacity-90">
                          {formatTime(event.start)}
                        </div>
                        
                        {/* Ім'я клієнта + NEW бейдж */}
                        <div className="text-[11px] font-semibold leading-tight truncate">
                          {event.clientName || event.text}
                          {event.isNewClient && (
                            <span className="ml-1 px-1 py-px text-[7px] font-bold bg-white/30 rounded text-white uppercase align-middle">
                              new
                            </span>
                          )}
                        </div>
                        
                        {/* Послуга */}
                        {event.serviceName && (
                          <div className="text-[9px] opacity-80 leading-tight truncate">{event.serviceName}</div>
                        )}
                      </div>
                      
                      {/* Resize handle bottom — desktop visible, mobile через long press */}
                      <div className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize z-10 lg:hover:bg-white/20 transition-colors">
                        <div className="hidden lg:flex absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white/50" />
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
          </div>{/* end resource columns flex */}

          {/* Фіча 2: Горизонтальна лінія-вказівник + час зліва */}
          {dragRender && dragRender.phase === 'dragging' && (() => {
            const totalMinutes = (dayEndHour - dayStartHour) * 60;
            const topPercent = ((dragRender.targetStartMin - dayStartHour * 60) / totalMinutes) * 100;
            const showEndLine = dragRender.mode === 'resize-bottom';
            const endTopPercent = showEndLine
              ? ((dragRender.targetEndMin - dayStartHour * 60) / totalMinutes) * 100
              : 0;

            return (
              <>
                {/* Start line — z-[25] поверх sticky time column (z-20), width = 100% gridRef */}
                <div
                  className="absolute pointer-events-none z-[25]"
                  style={{ top: `${topPercent}%`, left: 0, width: resources.length > 3 ? `${40 + resources.length * 110}px` : '100%' }}
                >
                  <div className="absolute left-0 right-0 h-[2px] bg-black/50" />
                  <div
                    className="absolute bg-black text-white rounded px-1.5 py-0.5 text-[9px] font-bold leading-tight whitespace-nowrap"
                    style={{ left: 0, top: '-10px' }}
                  >
                    {formatMinutes(dragRender.targetStartMin)}
                  </div>
                </div>

                {/* End line (only for resize-bottom) */}
                {showEndLine && (
                  <div
                    className="absolute pointer-events-none z-[25]"
                    style={{ top: `${endTopPercent}%`, left: 0, width: resources.length > 3 ? `${40 + resources.length * 110}px` : '100%' }}
                  >
                    <div className="absolute left-0 right-0 h-[2px] bg-black/50" />
                    <div
                      className="absolute bg-black text-white rounded px-1.5 py-0.5 text-[9px] font-bold leading-tight whitespace-nowrap"
                      style={{ left: 0, top: '-10px' }}
                    >
                      {formatMinutes(dragRender.targetEndMin)}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
        
        {/* Кінець робочого дня */}
        <div className="sticky left-0 flex items-center justify-center py-3 lg:pb-4 text-gray-400" style={{ width: '100vw', maxWidth: '100%' }}>
          <span className="text-sm">Робота закінчилась, час додому ❤️</span>
        </div>
        {/* Spacer для скролу під WeekBar + MobileNav */}
        <div className="h-[110px] lg:h-0 shrink-0" />
      </div>{/* end scroll container */}
      </div>{/* end horizontal scroll wrapper */}

      {/* Drag / Resize ghost overlay */}
      {dragRender && dragRender.phase === 'dragging' && (() => {
        const ev = dragRender.event;
        const targetResource = resources.find(r => r.id === dragRender.targetResourceId);
        const ghostColor = targetResource?.color || ev.backColor || '#666';
        const isResize = dragRender.mode === 'resize-top' || dragRender.mode === 'resize-bottom';
        const durationMin = dragRender.targetEndMin - dragRender.targetStartMin;

        return (
          <>
            {/* Карточка — ВИЩЕ пальця, без transition для мгновенного слідкування */}
            <div
              className="fixed z-[90] pointer-events-none select-none animate-ghost-up"
              style={{
                left: dragRender.ghostX - 70,
                bottom: `calc(100vh - ${dragRender.ghostY}px + 22px)`,
              }}
            >
              <div
                className="w-[140px] rounded-xl px-3 py-2 text-white text-[11px] font-semibold shadow-2xl"
                style={{
                  background: `linear-gradient(160deg, ${ghostColor} 0%, ${darkenColor(ghostColor, 15)} 100%)`,
                  opacity: 0.95,
                }}
              >
                <div className="font-bold text-[12px]">
                  {formatMinutes(dragRender.targetStartMin)} – {formatMinutes(dragRender.targetEndMin)}
                </div>
                <div className="truncate opacity-90">{ev.clientName || ev.text}</div>
                {isResize && (
                  <div className="text-[9px] opacity-70 mt-0.5">
                    ⏱ {durationMin} хв
                  </div>
                )}
              </div>
            </div>

            {/* Подпись мастера / resize — НИЖЕ пальця */}
            <div
              className="fixed z-[90] pointer-events-none select-none animate-ghost-down"
              style={{
                left: dragRender.ghostX - 70,
                top: dragRender.ghostY + 44,
              }}
            >
              {dragRender.mode === 'move' && (
                <div className="text-center text-[11px] text-gray-700 bg-white/95 rounded-lg px-3 py-1 shadow-md font-semibold">
                  → {targetResource?.name || '?'}
                </div>
              )}
              {isResize && (
                <div className="text-center text-[11px] text-gray-700 bg-white/95 rounded-lg px-3 py-1 shadow-md font-semibold">
                  ↕ {dragRender.mode === 'resize-top' ? 'початок' : 'кінець'}
                </div>
              )}
            </div>
          </>
        );
      })()}

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

      {/* FAB - кнопка додавання запису */}
      <button
        onClick={() => {
          // TODO: відкрити модалку створення запису
          alert('Додати новий запис');
        }}
        className="fixed bottom-[108px] lg:bottom-4 right-2 w-14 h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl shadow-lg flex items-center justify-center transition-all active:scale-95 z-50"
      >
        <Plus className="w-7 h-7" strokeWidth={2} />
      </button>
    </div>
  );
}
