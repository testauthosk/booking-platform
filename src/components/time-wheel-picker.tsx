'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Picker from 'react-mobile-picker';

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
    const slots: string[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    // First pass - try to filter past times if isToday
    for (let h = workingHours.start; h <= workingHours.end; h++) {
      for (let m = 0; m < 60; m += 5) {
        if (h === workingHours.end && m > 0) continue;
        if (isToday && (h < currentHour || (h === currentHour && m <= currentMin))) {
          continue;
        }
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    
    // If no slots available (all times passed), show all times anyway
    if (slots.length === 0) {
      for (let h = workingHours.start; h <= workingHours.end; h++) {
        for (let m = 0; m < 60; m += 5) {
          if (h === workingHours.end && m > 0) continue;
          slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      }
    }
    
    return slots;
  }, [workingHours, isToday]);

  // Generate end time slots
  const endTimeSlots = useMemo(() => {
    const slots: string[] = [];
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
          slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      }
    }
    return slots;
  }, [workingHours, isToday, duration]);

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

  const [pickerValue, setPickerValue] = useState({
    start: startTime,
    end: calculateEndTime(startTime, duration),
  });

  // Update when duration changes
  useEffect(() => {
    const newEnd = calculateEndTime(pickerValue.start, duration);
    setPickerValue(prev => ({ ...prev, end: newEnd }));
    onTimeChange(pickerValue.start, newEnd);
  }, [duration]);

  const handleChange = (value: { start: string; end: string }, key: string) => {
    if (key === 'start') {
      const newEnd = calculateEndTime(value.start, duration);
      const newValue = { start: value.start, end: newEnd };
      setPickerValue(newValue);
      onTimeChange(value.start, newEnd);
    } else {
      const newStart = calculateStartTime(value.end, duration);
      if (timeSlots.includes(newStart)) {
        const newValue = { start: newStart, end: value.end };
        setPickerValue(newValue);
        onTimeChange(newStart, value.end);
      }
    }
  };

  return (
    <div>
      {/* Labels */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 text-center">
          <p className="text-xs text-zinc-400">Початок</p>
        </div>
        <div className="w-12" />
        <div className="flex-1 text-center">
          <p className="text-xs text-zinc-400">Кінець</p>
        </div>
      </div>
    
      {/* Picker */}
      <div className="relative">
        <Picker
          value={pickerValue}
          onChange={handleChange}
          height={180}
          itemHeight={36}
          wheelMode="natural"
        >
          <Picker.Column name="start">
            {timeSlots.map(time => (
              <Picker.Item key={time} value={time}>
                {({ selected }) => (
                  <div className={`text-center transition-all duration-150 ${
                    selected ? 'text-white font-semibold text-lg' : 'text-zinc-500'
                  }`}>
                    {time}
                  </div>
                )}
              </Picker.Item>
            ))}
          </Picker.Column>
          
          <Picker.Column name="end">
            {endTimeSlots.map(time => (
              <Picker.Item key={time} value={time}>
                {({ selected }) => (
                  <div className={`text-center transition-all duration-150 ${
                    selected ? 'text-white font-semibold text-lg' : 'text-zinc-500'
                  }`}>
                    {time}
                  </div>
                )}
              </Picker.Item>
            ))}
          </Picker.Column>
        </Picker>
        
        {/* Duration indicator overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center text-zinc-500">
            <span className="text-xl">→</span>
            <span className="text-[10px]">{duration}хв</span>
          </div>
        </div>
      </div>
    </div>
  );
}
