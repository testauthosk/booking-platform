'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { WheelPicker, WheelPickerWrapper, type WheelPickerOption } from '@ncdai/react-wheel-picker';
import '@ncdai/react-wheel-picker/style.css';

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
  
  // Generate time slots with 5-minute step
  const timeSlots = useMemo(() => {
    const slots: WheelPickerOption<string>[] = [];
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
        
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        slots.push({ value: time, label: time });
      }
    }
    return slots;
  }, [workingHours, isToday]);

  // Generate end time slots (extended range for long services)
  const endTimeSlots = useMemo(() => {
    const slots: WheelPickerOption<string>[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    const minEndTotal = isToday 
      ? (currentHour * 60 + currentMin + duration) 
      : (workingHours.start * 60 + duration);
    
    const maxHour = Math.min(workingHours.end + 4, 23);
    
    for (let h = workingHours.start; h <= maxHour; h++) {
      for (let m = 0; m < 60; m += 5) {
        const totalMin = h * 60 + m;
        
        if (totalMin >= minEndTotal) {
          const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          slots.push({ value: time, label: time });
        }
      }
    }
    return slots;
  }, [workingHours, isToday, duration]);

  // Calculate end time from start + duration
  const calculateEndTime = useCallback((start: string, dur: number): string => {
    const [h, m] = start.split(':').map(Number);
    const totalMinutes = h * 60 + m + dur;
    return `${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')}`;
  }, []);

  // Calculate start time from end - duration
  const calculateStartTime = useCallback((end: string, dur: number): string => {
    const [h, m] = end.split(':').map(Number);
    const totalMinutes = h * 60 + m - dur;
    const startH = Math.max(Math.floor(totalMinutes / 60), workingHours.start);
    const startM = Math.max(totalMinutes % 60, 0);
    return `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
  }, [workingHours]);

  const [selectedStart, setSelectedStart] = useState(startTime);
  const [selectedEnd, setSelectedEnd] = useState(calculateEndTime(startTime, duration));

  // Update end time when duration changes
  useEffect(() => {
    const newEnd = calculateEndTime(selectedStart, duration);
    setSelectedEnd(newEnd);
    onTimeChange(selectedStart, newEnd);
  }, [duration]);

  // Handle start time change
  const handleStartChange = (value: string) => {
    setSelectedStart(value);
    const newEnd = calculateEndTime(value, duration);
    setSelectedEnd(newEnd);
    onTimeChange(value, newEnd);
  };

  // Handle end time change
  const handleEndChange = (value: string) => {
    setSelectedEnd(value);
    const newStart = calculateStartTime(value, duration);
    // Only update start if it's valid
    if (timeSlots.some(s => s.value === newStart)) {
      setSelectedStart(newStart);
      onTimeChange(newStart, value);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Start wheel */}
      <div className="flex-1">
        <p className="text-xs text-zinc-400 text-center mb-2">Початок</p>
        <div className="relative rounded-xl overflow-hidden bg-zinc-800/50">
          <WheelPickerWrapper className="h-[180px]">
            <WheelPicker
              options={timeSlots}
              value={selectedStart}
              onValueChange={handleStartChange}
              optionItemHeight={36}
              visibleCount={20}
              classNames={{
                optionItem: 'text-zinc-500',
                highlightItem: 'text-white font-semibold text-lg',
                highlightWrapper: 'bg-zinc-700/50 rounded-lg mx-1',
              }}
            />
          </WheelPickerWrapper>
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
        <div className="relative rounded-xl overflow-hidden bg-zinc-800/50">
          <WheelPickerWrapper className="h-[180px]">
            <WheelPicker
              options={endTimeSlots}
              value={selectedEnd}
              onValueChange={handleEndChange}
              optionItemHeight={36}
              visibleCount={20}
              classNames={{
                optionItem: 'text-zinc-500',
                highlightItem: 'text-white font-semibold text-lg',
                highlightWrapper: 'bg-zinc-700/50 rounded-lg mx-1',
              }}
            />
          </WheelPickerWrapper>
        </div>
      </div>
    </div>
  );
}
