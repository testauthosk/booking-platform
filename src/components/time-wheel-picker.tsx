'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface TimeWheelPickerProps {
  startTime: string;
  duration: number; // in minutes
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
  const ITEM_HEIGHT = 44;
  const VISIBLE_ITEMS = 5;
  
  // Generate time slots based on working hours
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
    // End times can go 2 hours beyond working hours for last appointments
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
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  }, []);

  const calculateStartTime = useCallback((end: string, dur: number): string => {
    const [h, m] = end.split(':').map(Number);
    const totalMinutes = h * 60 + m - dur;
    const startH = Math.floor(totalMinutes / 60);
    const startM = totalMinutes % 60;
    if (startH < workingHours.start) return timeSlots[0];
    return `${Math.max(startH, workingHours.start).toString().padStart(2, '0')}:${Math.max(startM, 0).toString().padStart(2, '0')}`;
  }, [workingHours, timeSlots]);

  // Check if time is in past
  const isTimePast = useCallback((time: string): boolean => {
    if (!isToday) return false;
    const now = new Date();
    const [h, m] = time.split(':').map(Number);
    return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
  }, [isToday]);

  // State
  const [selectedStart, setSelectedStart] = useState(startTime);
  const [selectedEnd, setSelectedEnd] = useState(calculateEndTime(startTime, duration));
  
  // Refs for wheels
  const startWheelRef = useRef<HTMLDivElement>(null);
  const endWheelRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  // Smooth scroll to index
  const smoothScrollTo = (element: HTMLDivElement | null, index: number) => {
    if (!element) return;
    const targetScroll = index * ITEM_HEIGHT;
    element.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });
  };

  // Initialize scroll positions
  useEffect(() => {
    const startIndex = timeSlots.indexOf(startTime);
    const endIndex = endTimeSlots.indexOf(calculateEndTime(startTime, duration));
    
    if (startWheelRef.current && startIndex >= 0) {
      startWheelRef.current.scrollTop = startIndex * ITEM_HEIGHT;
    }
    if (endWheelRef.current && endIndex >= 0) {
      endWheelRef.current.scrollTop = endIndex * ITEM_HEIGHT;
    }
  }, []);

  // Handle start wheel scroll
  const handleStartScroll = useCallback(() => {
    if (!startWheelRef.current || isSyncing.current) return;
    
    const scrollTop = startWheelRef.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, timeSlots.length - 1));
    const newStart = timeSlots[clampedIndex];
    
    if (newStart && !isTimePast(newStart)) {
      const newEnd = calculateEndTime(newStart, duration);
      
      setSelectedStart(newStart);
      setSelectedEnd(newEnd);
      onTimeChange(newStart, newEnd);
      
      // Sync end wheel with smooth animation
      const endIndex = endTimeSlots.indexOf(newEnd);
      if (endIndex >= 0 && endWheelRef.current) {
        isSyncing.current = true;
        smoothScrollTo(endWheelRef.current, endIndex);
        setTimeout(() => { isSyncing.current = false; }, 300);
      }
    }
  }, [timeSlots, endTimeSlots, duration, calculateEndTime, isTimePast, onTimeChange]);

  // Handle end wheel scroll
  const handleEndScroll = useCallback(() => {
    if (!endWheelRef.current || isSyncing.current) return;
    
    const scrollTop = endWheelRef.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, endTimeSlots.length - 1));
    const newEnd = endTimeSlots[clampedIndex];
    
    if (newEnd) {
      const newStart = calculateStartTime(newEnd, duration);
      
      if (!isTimePast(newStart) && timeSlots.includes(newStart)) {
        setSelectedEnd(newEnd);
        setSelectedStart(newStart);
        onTimeChange(newStart, newEnd);
        
        // Sync start wheel with smooth animation
        const startIndex = timeSlots.indexOf(newStart);
        if (startIndex >= 0 && startWheelRef.current) {
          isSyncing.current = true;
          smoothScrollTo(startWheelRef.current, startIndex);
          setTimeout(() => { isSyncing.current = false; }, 300);
        }
      }
    }
  }, [timeSlots, endTimeSlots, duration, calculateStartTime, isTimePast, onTimeChange]);

  // Debounce scroll handlers for snapping
  const scrollEndTimeout = useRef<NodeJS.Timeout>();
  
  const onStartScrollEnd = useCallback(() => {
    if (scrollEndTimeout.current) clearTimeout(scrollEndTimeout.current);
    scrollEndTimeout.current = setTimeout(() => {
      handleStartScroll();
      // Snap to nearest item
      if (startWheelRef.current) {
        const scrollTop = startWheelRef.current.scrollTop;
        const index = Math.round(scrollTop / ITEM_HEIGHT);
        smoothScrollTo(startWheelRef.current, index);
      }
    }, 50);
  }, [handleStartScroll]);

  const onEndScrollEnd = useCallback(() => {
    if (scrollEndTimeout.current) clearTimeout(scrollEndTimeout.current);
    scrollEndTimeout.current = setTimeout(() => {
      handleEndScroll();
      // Snap to nearest item
      if (endWheelRef.current) {
        const scrollTop = endWheelRef.current.scrollTop;
        const index = Math.round(scrollTop / ITEM_HEIGHT);
        smoothScrollTo(endWheelRef.current, index);
      }
    }, 50);
  }, [handleEndScroll]);

  // Click to select time directly
  const handleStartClick = (time: string, index: number) => {
    if (isTimePast(time)) return;
    
    setSelectedStart(time);
    const newEnd = calculateEndTime(time, duration);
    setSelectedEnd(newEnd);
    onTimeChange(time, newEnd);
    
    smoothScrollTo(startWheelRef.current, index);
    const endIndex = endTimeSlots.indexOf(newEnd);
    if (endIndex >= 0) {
      smoothScrollTo(endWheelRef.current, endIndex);
    }
  };

  const handleEndClick = (time: string, index: number) => {
    const newStart = calculateStartTime(time, duration);
    if (isTimePast(newStart)) return;
    
    setSelectedEnd(time);
    setSelectedStart(newStart);
    onTimeChange(newStart, time);
    
    smoothScrollTo(endWheelRef.current, index);
    const startIndex = timeSlots.indexOf(newStart);
    if (startIndex >= 0) {
      smoothScrollTo(startWheelRef.current, startIndex);
    }
  };

  const paddingItems = Math.floor(VISIBLE_ITEMS / 2);

  return (
    <div className="flex items-center gap-2">
      {/* Start time wheel */}
      <div className="flex-1">
        <p className="text-xs text-zinc-400 text-center mb-2 font-medium">Початок</p>
        <div className="relative h-[220px] overflow-hidden rounded-xl bg-zinc-900/50">
          {/* Gradient overlays for fade effect */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-zinc-800 via-zinc-800/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-zinc-800 via-zinc-800/80 to-transparent z-10 pointer-events-none" />
          
          {/* Selection highlight */}
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-11 bg-primary/20 border border-primary/30 rounded-xl z-0" />
          
          {/* Scrollable wheel */}
          <div
            ref={startWheelRef}
            onScroll={onStartScrollEnd}
            className="h-full overflow-y-auto scrollbar-hide scroll-smooth"
            style={{ 
              scrollSnapType: 'y mandatory',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {/* Top padding */}
            {Array.from({ length: paddingItems }).map((_, i) => (
              <div key={`pad-top-${i}`} className="h-11" />
            ))}
            
            {timeSlots.map((time, index) => {
              const isPast = isTimePast(time);
              const isSelected = time === selectedStart;
              return (
                <div
                  key={time}
                  onClick={() => handleStartClick(time, index)}
                  className={`h-11 flex items-center justify-center cursor-pointer transition-all duration-150 ${
                    isPast
                      ? 'text-zinc-600 line-through cursor-not-allowed'
                      : isSelected
                      ? 'text-white text-xl font-bold scale-110'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  style={{ scrollSnapAlign: 'center' }}
                >
                  {time}
                </div>
              );
            })}
            
            {/* Bottom padding */}
            {Array.from({ length: paddingItems }).map((_, i) => (
              <div key={`pad-bot-${i}`} className="h-11" />
            ))}
          </div>
        </div>
      </div>

      {/* Arrow separator */}
      <div className="flex flex-col items-center justify-center pt-6 text-zinc-500">
        <span className="text-2xl">→</span>
        <span className="text-xs mt-1">{duration} хв</span>
      </div>

      {/* End time wheel */}
      <div className="flex-1">
        <p className="text-xs text-zinc-400 text-center mb-2 font-medium">Кінець</p>
        <div className="relative h-[220px] overflow-hidden rounded-xl bg-zinc-900/50">
          {/* Gradient overlays */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-zinc-800 via-zinc-800/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-zinc-800 via-zinc-800/80 to-transparent z-10 pointer-events-none" />
          
          {/* Selection highlight */}
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-11 bg-primary/20 border border-primary/30 rounded-xl z-0" />
          
          {/* Scrollable wheel */}
          <div
            ref={endWheelRef}
            onScroll={onEndScrollEnd}
            className="h-full overflow-y-auto scrollbar-hide scroll-smooth"
            style={{ 
              scrollSnapType: 'y mandatory',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {/* Top padding */}
            {Array.from({ length: paddingItems }).map((_, i) => (
              <div key={`pad-top-${i}`} className="h-11" />
            ))}
            
            {endTimeSlots.map((time, index) => {
              const isSelected = time === selectedEnd;
              return (
                <div
                  key={time}
                  onClick={() => handleEndClick(time, index)}
                  className={`h-11 flex items-center justify-center cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'text-white text-xl font-bold scale-110'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  style={{ scrollSnapAlign: 'center' }}
                >
                  {time}
                </div>
              );
            })}
            
            {/* Bottom padding */}
            {Array.from({ length: paddingItems }).map((_, i) => (
              <div key={`pad-bot-${i}`} className="h-11" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
