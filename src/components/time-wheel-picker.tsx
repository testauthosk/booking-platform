'use client';

import { useState, useEffect, useRef } from 'react';

interface TimeWheelPickerProps {
  startTime: string;
  duration: number; // in minutes
  onTimeChange: (start: string, end: string) => void;
  workingHours?: { start: number; end: number };
  disabledTimes?: string[]; // times that are already booked
  isToday?: boolean;
}

export function TimeWheelPicker({
  startTime,
  duration,
  onTimeChange,
  workingHours = { start: 9, end: 20 },
  disabledTimes = [],
  isToday = false,
}: TimeWheelPickerProps) {
  // Generate time slots
  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let h = workingHours.start; h <= workingHours.end; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < workingHours.end) {
        slots.push(`${h.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  
  // Calculate end time from start time + duration
  const calculateEndTime = (start: string, dur: number): string => {
    const [h, m] = start.split(':').map(Number);
    const totalMinutes = h * 60 + m + dur;
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  // Calculate start time from end time - duration
  const calculateStartTime = (end: string, dur: number): string => {
    const [h, m] = end.split(':').map(Number);
    const totalMinutes = h * 60 + m - dur;
    const startH = Math.floor(totalMinutes / 60);
    const startM = totalMinutes % 60;
    if (startH < workingHours.start) return timeSlots[0];
    return `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
  };

  const [selectedStart, setSelectedStart] = useState(startTime);
  const [selectedEnd, setSelectedEnd] = useState(calculateEndTime(startTime, duration));

  const startRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Generate end time slots (can go beyond working hours for last appointment)
  const generateEndTimeSlots = () => {
    const slots: string[] = [];
    for (let h = workingHours.start; h <= workingHours.end + 2; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const endTimeSlots = generateEndTimeSlots();

  // Check if time is in past (for today)
  const isTimePast = (time: string): boolean => {
    if (!isToday) return false;
    const now = new Date();
    const [h, m] = time.split(':').map(Number);
    return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
  };

  // Scroll to selected time on mount
  useEffect(() => {
    scrollToTime(startRef.current, selectedStart, timeSlots);
    scrollToTime(endRef.current, selectedEnd, endTimeSlots);
  }, []);

  const scrollToTime = (container: HTMLDivElement | null, time: string, slots: string[]) => {
    if (!container) return;
    const index = slots.indexOf(time);
    if (index >= 0) {
      const itemHeight = 44;
      container.scrollTop = index * itemHeight;
    }
  };

  // Track if we're programmatically scrolling to prevent loops
  const isScrollingEnd = useRef(false);
  const isScrollingStart = useRef(false);

  const handleStartScroll = () => {
    if (!startRef.current || isScrollingStart.current) return;
    
    const itemHeight = 44;
    const scrollTop = startRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const newStart = timeSlots[Math.min(index, timeSlots.length - 1)];
    
    if (newStart && !isTimePast(newStart)) {
      setSelectedStart(newStart);
      const newEnd = calculateEndTime(newStart, duration);
      setSelectedEnd(newEnd);
      onTimeChange(newStart, newEnd);
      
      // Sync end wheel immediately
      if (endRef.current && !isScrollingEnd.current) {
        isScrollingEnd.current = true;
        const endIndex = endTimeSlots.indexOf(newEnd);
        if (endIndex >= 0) {
          endRef.current.scrollTop = endIndex * itemHeight;
        }
        requestAnimationFrame(() => {
          isScrollingEnd.current = false;
        });
      }
    }
  };

  const handleEndScroll = () => {
    if (!endRef.current || isScrollingEnd.current) return;
    
    const itemHeight = 44;
    const scrollTop = endRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const newEnd = endTimeSlots[Math.min(index, endTimeSlots.length - 1)];
    
    if (newEnd) {
      const newStart = calculateStartTime(newEnd, duration);
      if (!isTimePast(newStart) && timeSlots.includes(newStart)) {
        setSelectedEnd(newEnd);
        setSelectedStart(newStart);
        onTimeChange(newStart, newEnd);
        
        // Sync start wheel immediately
        if (startRef.current && !isScrollingStart.current) {
          isScrollingStart.current = true;
          const startIndex = timeSlots.indexOf(newStart);
          if (startIndex >= 0) {
            startRef.current.scrollTop = startIndex * itemHeight;
          }
          requestAnimationFrame(() => {
            isScrollingStart.current = false;
          });
        }
      }
    }
  };

  const onStartScroll = handleStartScroll;
  const onEndScroll = handleEndScroll;

  return (
    <div className="flex gap-4">
      {/* Start time wheel */}
      <div className="flex-1">
        <p className="text-xs text-zinc-400 text-center mb-2">Початок</p>
        <div className="relative h-[220px] overflow-hidden">
          {/* Gradient overlays */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-zinc-800 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-zinc-800 to-transparent z-10 pointer-events-none" />
          
          {/* Selection highlight */}
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-11 bg-zinc-700/50 rounded-xl z-0" />
          
          {/* Scrollable times */}
          <div
            ref={startRef}
            onScroll={onStartScroll}
            className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
            style={{ paddingTop: '88px', paddingBottom: '88px' }}
          >
            {timeSlots.map((time) => {
              const isPast = isTimePast(time);
              const isSelected = time === selectedStart;
              return (
                <div
                  key={time}
                  className={`h-11 flex items-center justify-center snap-center transition-all ${
                    isPast
                      ? 'text-zinc-600 line-through'
                      : isSelected
                      ? 'text-white text-lg font-semibold'
                      : 'text-zinc-400'
                  }`}
                >
                  {time}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="flex items-center text-zinc-500 text-2xl font-light">
        →
      </div>

      {/* End time wheel */}
      <div className="flex-1">
        <p className="text-xs text-zinc-400 text-center mb-2">Кінець</p>
        <div className="relative h-[220px] overflow-hidden">
          {/* Gradient overlays */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-zinc-800 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-zinc-800 to-transparent z-10 pointer-events-none" />
          
          {/* Selection highlight */}
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-11 bg-zinc-700/50 rounded-xl z-0" />
          
          {/* Scrollable times */}
          <div
            ref={endRef}
            onScroll={onEndScroll}
            className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
            style={{ paddingTop: '88px', paddingBottom: '88px' }}
          >
            {endTimeSlots.map((time) => {
              const isSelected = time === selectedEnd;
              return (
                <div
                  key={time}
                  className={`h-11 flex items-center justify-center snap-center transition-all ${
                    isSelected
                      ? 'text-white text-lg font-semibold'
                      : 'text-zinc-400'
                  }`}
                >
                  {time}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
