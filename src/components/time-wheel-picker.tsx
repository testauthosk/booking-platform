'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface TimeWheelPickerProps {
  startTime: string;
  duration: number;
  onTimeChange: (start: string, end: string) => void;
  workingHours?: { start: number; end: number };
  isToday?: boolean;
}

export function TimeWheelPicker({
  startTime,
  duration,
  onTimeChange,
  workingHours = { start: 9, end: 20 },
  isToday = false,
}: TimeWheelPickerProps) {
  const ITEM_HEIGHT = 40;
  const VISIBLE_COUNT = 5;
  const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;

  // Generate time slots
  const generateTimeSlots = useCallback(() => {
    const slots: string[] = [];
    for (let h = workingHours.start; h <= workingHours.end; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < workingHours.end) {
        slots.push(`${h.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  }, [workingHours]);

  const generateEndTimeSlots = useCallback(() => {
    const slots: string[] = [];
    for (let h = workingHours.start; h <= workingHours.end + 2; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, [workingHours]);

  const timeSlots = generateTimeSlots();
  const endTimeSlots = generateEndTimeSlots();

  // Calculate times
  const calculateEndTime = useCallback((start: string, dur: number): string => {
    const [h, m] = start.split(':').map(Number);
    const totalMinutes = h * 60 + m + dur;
    return `${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')}`;
  }, []);

  const calculateStartTime = useCallback((end: string, dur: number): string => {
    const [h, m] = end.split(':').map(Number);
    const totalMinutes = h * 60 + m - dur;
    const startH = Math.max(Math.floor(totalMinutes / 60), workingHours.start);
    const startM = Math.max(totalMinutes % 60, 0);
    return `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
  }, [workingHours]);

  const isTimePast = useCallback((time: string): boolean => {
    if (!isToday) return false;
    const now = new Date();
    const [h, m] = time.split(':').map(Number);
    return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
  }, [isToday]);

  const [selectedStart, setSelectedStart] = useState(startTime);
  const [selectedEnd, setSelectedEnd] = useState(calculateEndTime(startTime, duration));

  const startRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout>();

  // Scroll to index instantly (for init)
  const scrollToIndex = (ref: HTMLDivElement | null, index: number, smooth = false) => {
    if (!ref) return;
    const y = index * ITEM_HEIGHT;
    if (smooth) {
      ref.scrollTo({ top: y, behavior: 'smooth' });
    } else {
      ref.scrollTop = y;
    }
  };

  // Initialize
  useEffect(() => {
    const startIdx = timeSlots.indexOf(startTime);
    const endIdx = endTimeSlots.indexOf(calculateEndTime(startTime, duration));
    
    requestAnimationFrame(() => {
      scrollToIndex(startRef.current, Math.max(0, startIdx), false);
      scrollToIndex(endRef.current, Math.max(0, endIdx), false);
    });
  }, []);

  // Handle scroll end with snap
  const handleScrollEnd = (
    ref: HTMLDivElement,
    slots: string[],
    setSelected: (val: string) => void,
    isStart: boolean
  ) => {
    const scrollTop = ref.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, slots.length - 1));
    const newTime = slots[clampedIndex];

    // Snap to position
    scrollToIndex(ref, clampedIndex, true);

    if (isStart) {
      if (!isTimePast(newTime)) {
        setSelected(newTime);
        const newEnd = calculateEndTime(newTime, duration);
        setSelectedEnd(newEnd);
        onTimeChange(newTime, newEnd);

        // Sync end wheel
        if (!isSyncing.current) {
          isSyncing.current = true;
          const endIdx = endTimeSlots.indexOf(newEnd);
          if (endIdx >= 0) {
            scrollToIndex(endRef.current, endIdx, true);
          }
          setTimeout(() => { isSyncing.current = false; }, 200);
        }
      }
    } else {
      const newStart = calculateStartTime(newTime, duration);
      if (!isTimePast(newStart) && timeSlots.includes(newStart)) {
        setSelected(newTime);
        setSelectedStart(newStart);
        onTimeChange(newStart, newTime);

        // Sync start wheel
        if (!isSyncing.current) {
          isSyncing.current = true;
          const startIdx = timeSlots.indexOf(newStart);
          if (startIdx >= 0) {
            scrollToIndex(startRef.current, startIdx, true);
          }
          setTimeout(() => { isSyncing.current = false; }, 200);
        }
      }
    }
  };

  const onScroll = (isStart: boolean) => {
    if (isSyncing.current) return;
    
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      const ref = isStart ? startRef.current : endRef.current;
      const slots = isStart ? timeSlots : endTimeSlots;
      const setSelected = isStart ? setSelectedStart : setSelectedEnd;
      if (ref) {
        handleScrollEnd(ref, slots, setSelected, isStart);
      }
    }, 80);
  };

  // Render wheel items
  const renderWheel = (
    slots: string[],
    selected: string,
    isPastCheck: boolean
  ) => {
    const paddingCount = Math.floor(VISIBLE_COUNT / 2);
    
    return (
      <>
        {/* Top padding */}
        {Array.from({ length: paddingCount }).map((_, i) => (
          <div key={`top-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
        
        {slots.map((time) => {
          const isPast = isPastCheck && isTimePast(time);
          const isSelected = time === selected;
          
          return (
            <div
              key={time}
              style={{ height: ITEM_HEIGHT }}
              className={`flex items-center justify-center select-none transition-all duration-100 ${
                isPast
                  ? 'text-zinc-600 line-through'
                  : isSelected
                  ? 'text-white font-semibold text-lg'
                  : 'text-zinc-500'
              }`}
            >
              {time}
            </div>
          );
        })}
        
        {/* Bottom padding */}
        {Array.from({ length: paddingCount }).map((_, i) => (
          <div key={`bot-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
      </>
    );
  };

  return (
    <div className="flex items-center gap-3">
      {/* Start wheel */}
      <div className="flex-1">
        <p className="text-xs text-zinc-400 text-center mb-2">Початок</p>
        <div 
          className="relative overflow-hidden rounded-xl"
          style={{ height: WHEEL_HEIGHT }}
        >
          {/* Gradient masks */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-zinc-800 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-800 to-transparent z-10 pointer-events-none" />
          
          {/* Center highlight */}
          <div 
            className="absolute inset-x-1 z-0 bg-zinc-700/50 rounded-lg pointer-events-none"
            style={{ 
              top: ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2),
              height: ITEM_HEIGHT 
            }}
          />
          
          {/* Scrollable area */}
          <div
            ref={startRef}
            onScroll={() => onScroll(true)}
            className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide"
            style={{
              touchAction: 'pan-y',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {renderWheel(timeSlots, selectedStart, true)}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="flex flex-col items-center justify-center text-zinc-500 pt-6">
        <span className="text-xl">→</span>
        <span className="text-[10px] mt-0.5">{duration}хв</span>
      </div>

      {/* End wheel */}
      <div className="flex-1">
        <p className="text-xs text-zinc-400 text-center mb-2">Кінець</p>
        <div 
          className="relative overflow-hidden rounded-xl"
          style={{ height: WHEEL_HEIGHT }}
        >
          {/* Gradient masks */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-zinc-800 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-800 to-transparent z-10 pointer-events-none" />
          
          {/* Center highlight */}
          <div 
            className="absolute inset-x-1 z-0 bg-zinc-700/50 rounded-lg pointer-events-none"
            style={{ 
              top: ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2),
              height: ITEM_HEIGHT 
            }}
          />
          
          {/* Scrollable area */}
          <div
            ref={endRef}
            onScroll={() => onScroll(false)}
            className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide"
            style={{
              touchAction: 'pan-y',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {renderWheel(endTimeSlots, selectedEnd, false)}
          </div>
        </div>
      </div>
    </div>
  );
}
