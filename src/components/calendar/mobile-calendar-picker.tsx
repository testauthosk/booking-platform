'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const UK_MONTHS = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
];
const UK_DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

interface MobileCalendarPickerProps {
  isOpen: boolean;
  onClose: () => void;
  selected: Date;
  onSelect: (date: Date) => void;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  // Monday = 0
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = getDaysInMonth(year, month);
  const daysInPrev = getDaysInMonth(year, month - 1);

  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

  // Previous month tail
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, isCurrentMonth: true });
  }

  // Next month head — fill to 42 (6 rows)
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }

  return cells;
}

export function MobileCalendarPicker({ isOpen, onClose, selected, onSelect }: MobileCalendarPickerProps) {
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const [isMonthTransitioning, setIsMonthTransitioning] = useState(false);
  
  // Selection indicator animation
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; top: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const today = new Date();

  // Open animation
  useEffect(() => {
    if (isOpen) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
      setIsAnimatingOut(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
    }
  }, [isOpen]);

  // Update indicator position
  const updateIndicator = useCallback((date: Date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const cell = cellRefs.current.get(key);
    const grid = gridRef.current;
    if (cell && grid) {
      const gridRect = grid.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      setIndicatorStyle({
        left: cellRect.left - gridRect.left + (cellRect.width - 40) / 2,
        top: cellRect.top - gridRect.top + (cellRect.height - 40) / 2,
      });
    }
  }, []);

  useEffect(() => {
    if (isVisible && !isMonthTransitioning) {
      requestAnimationFrame(() => updateIndicator(selected));
    }
  }, [isVisible, selected, viewMonth, viewYear, isMonthTransitioning, updateIndicator]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsAnimatingOut(false);
      onClose();
    }, 400);
  }, [onClose]);

  const handleSelect = useCallback((year: number, month: number, day: number) => {
    const date = new Date(year, month, day);
    onSelect(date);
    // Animate indicator then close
    updateIndicator(date);
    setTimeout(() => handleClose(), 200);
  }, [onSelect, updateIndicator, handleClose]);

  const goToPrevMonth = useCallback(() => {
    setSlideDir('right');
    setIsMonthTransitioning(true);
    setTimeout(() => {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear(y => y - 1);
      } else {
        setViewMonth(m => m - 1);
      }
      setSlideDir(null);
      setIsMonthTransitioning(false);
    }, 250);
  }, [viewMonth]);

  const goToNextMonth = useCallback(() => {
    setSlideDir('left');
    setIsMonthTransitioning(true);
    setTimeout(() => {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear(y => y + 1);
      } else {
        setViewMonth(m => m + 1);
      }
      setSlideDir(null);
      setIsMonthTransitioning(false);
    }, 250);
  }, [viewMonth]);

  // Swipe to change months
  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 60) {
      if (dx > 0) goToPrevMonth();
      else goToNextMonth();
    }
  }, [goToPrevMonth, goToNextMonth]);

  if (!isOpen && !isAnimatingOut) return null;

  const cells = getMonthGrid(viewYear, viewMonth);

  return (
    <div className="lg:hidden fixed inset-0 z-[200]">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-400 ease-out ${isVisible ? 'opacity-50' : 'opacity-0'}`}
        onClick={handleClose}
      />
      
      {/* Sheet */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.2,0,0,1)] will-change-transform ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-3">
          <button 
            onClick={goToPrevMonth}
            className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-semibold tracking-tight">
            {UK_MONTHS[viewMonth]} {viewYear}
          </h3>
          <button 
            onClick={goToNextMonth}
            className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 px-4">
          {UK_DAYS_SHORT.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div 
          ref={gridRef}
          className={`relative grid grid-cols-7 px-4 pb-8 transition-all duration-250 ease-out ${
            slideDir === 'left' ? 'opacity-0 -translate-x-4' : 
            slideDir === 'right' ? 'opacity-0 translate-x-4' : 
            'opacity-100 translate-x-0'
          }`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Animated selection indicator */}
          {indicatorStyle && (
            <div 
              className="absolute w-10 h-10 rounded-xl bg-gray-900 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] will-change-transform pointer-events-none"
              style={{
                transform: `translate3d(${indicatorStyle.left}px, ${indicatorStyle.top}px, 0)`,
              }}
            />
          )}

          {cells.map((cell, i) => {
            const cellDate = new Date(cell.year, cell.month, cell.day);
            const isSelected = isSameDay(cellDate, selected);
            const isToday = isSameDay(cellDate, today);
            const key = `${cell.year}-${cell.month}-${cell.day}`;

            return (
              <button
                key={i}
                ref={(el) => { if (el) cellRefs.current.set(key, el); }}
                onClick={() => handleSelect(cell.year, cell.month, cell.day)}
                className={`relative z-10 flex items-center justify-center h-11 transition-colors duration-150 ${
                  !cell.isCurrentMonth ? 'text-gray-300' : ''
                }`}
              >
                <span className={`text-sm font-medium ${
                  isSelected ? 'text-white' :
                  isToday ? 'text-primary font-bold' :
                  cell.isCurrentMonth ? 'text-gray-900' : ''
                }`}>
                  {cell.day}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
