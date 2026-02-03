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
  const ITEM_HEIGHT = 36;
  const VISIBLE_COUNT = 5;
  const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;

  // Generate time slots with 5-minute step (filter out past times if today)
  const generateTimeSlots = useCallback(() => {
    const slots: string[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    for (let h = workingHours.start; h <= workingHours.end; h++) {
      for (let m = 0; m < 60; m += 5) {
        // Skip last hour's minutes except :00
        if (h === workingHours.end && m > 0) continue;
        
        // Skip past times for today
        if (isToday && (h < currentHour || (h === currentHour && m <= currentMin))) {
          continue;
        }
        
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, [workingHours, isToday]);

  const generateEndTimeSlots = useCallback(() => {
    const slots: string[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    // End time = start time + duration, so filter accordingly
    const minEndTotal = isToday ? (currentHour * 60 + currentMin + duration) : (workingHours.start * 60 + duration);
    
    // Extend to workingHours.end + 4 hours to support long services (up to 3h = 180min)
    const maxHour = Math.min(workingHours.end + 4, 23);
    
    for (let h = workingHours.start; h <= maxHour; h++) {
      for (let m = 0; m < 60; m += 5) {
        const totalMin = h * 60 + m;
        
        if (totalMin >= minEndTotal) {
          slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      }
    }
    return slots;
  }, [workingHours, isToday, duration]);

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

  const [selectedStart, setSelectedStart] = useState(startTime);
  const [selectedEnd, setSelectedEnd] = useState(calculateEndTime(startTime, duration));

  const startRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const activeWheel = useRef<'start' | 'end' | null>(null);
  const scrollTimeout = useRef<NodeJS.Timeout>();
  const lastScrollTime = useRef(0);

  // Update end time when duration changes
  useEffect(() => {
    const newEnd = calculateEndTime(selectedStart, duration);
    setSelectedEnd(newEnd);
    onTimeChange(selectedStart, newEnd);
    
    // Sync end wheel position
    const endIdx = endTimeSlots.indexOf(newEnd);
    if (endIdx >= 0 && endRef.current) {
      endRef.current.scrollTop = endIdx * ITEM_HEIGHT;
    }
  }, [duration]);

  // Initialize scroll positions
  useEffect(() => {
    const startIdx = timeSlots.indexOf(startTime);
    const endTime = calculateEndTime(startTime, duration);
    const endIdx = endTimeSlots.indexOf(endTime);
    
    requestAnimationFrame(() => {
      if (startRef.current) startRef.current.scrollTop = Math.max(0, startIdx) * ITEM_HEIGHT;
      if (endRef.current) endRef.current.scrollTop = Math.max(0, endIdx) * ITEM_HEIGHT;
    });
  }, [timeSlots, endTimeSlots]);

  // Real-time scroll sync - moves other wheel as you scroll
  const handleScroll = (isStart: boolean) => {
    const now = Date.now();
    const ref = isStart ? startRef.current : endRef.current;
    const otherRef = isStart ? endRef.current : startRef.current;
    if (!ref || !otherRef) return;

    // Set active wheel on first scroll
    if (!activeWheel.current || now - lastScrollTime.current > 150) {
      activeWheel.current = isStart ? 'start' : 'end';
    }
    lastScrollTime.current = now;

    // Only sync if this is the active wheel
    if ((isStart && activeWheel.current !== 'start') || (!isStart && activeWheel.current !== 'end')) {
      return;
    }

    const scrollTop = ref.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const slots = isStart ? timeSlots : endTimeSlots;
    const clampedIndex = Math.max(0, Math.min(index, slots.length - 1));
    const currentTime = slots[clampedIndex];

    if (isStart) {
      // Sync end wheel in real-time
      const newEnd = calculateEndTime(currentTime, duration);
      const endIdx = endTimeSlots.indexOf(newEnd);
      if (endIdx >= 0) {
        otherRef.scrollTop = endIdx * ITEM_HEIGHT;
      }
      setSelectedStart(currentTime);
      setSelectedEnd(newEnd);
    } else {
      // Sync start wheel in real-time  
      const newStart = calculateStartTime(currentTime, duration);
      const startIdx = timeSlots.indexOf(newStart);
      if (startIdx >= 0) {
        otherRef.scrollTop = startIdx * ITEM_HEIGHT;
      }
      setSelectedEnd(currentTime);
      setSelectedStart(newStart);
    }

    // Debounce the final snap and callback
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      // Snap to nearest item
      ref.scrollTo({ top: clampedIndex * ITEM_HEIGHT, behavior: 'smooth' });
      
      // Final values
      const finalStart = isStart ? currentTime : calculateStartTime(currentTime, duration);
      const finalEnd = isStart ? calculateEndTime(currentTime, duration) : currentTime;
      onTimeChange(finalStart, finalEnd);
      
      // Reset active wheel
      activeWheel.current = null;
    }, 100);
  };

  // Render wheel items
  const renderWheel = (slots: string[], selected: string) => {
    const paddingCount = Math.floor(VISIBLE_COUNT / 2);
    
    return (
      <>
        {/* Top padding */}
        {Array.from({ length: paddingCount }).map((_, i) => (
          <div key={`top-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
        
        {slots.map((time) => {
          const isSelected = time === selected;
          
          return (
            <div
              key={time}
              style={{ height: ITEM_HEIGHT }}
              className={`flex items-center justify-center select-none transition-all duration-75 ${
                isSelected
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
            onScroll={() => handleScroll(true)}
            className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide"
            style={{
              touchAction: 'pan-y',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {renderWheel(timeSlots, selectedStart)}
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
            onScroll={() => handleScroll(false)}
            className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide"
            style={{
              touchAction: 'pan-y',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {renderWheel(endTimeSlots, selectedEnd)}
          </div>
        </div>
      </div>
    </div>
  );
}
