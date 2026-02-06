'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface CalendarDateContextValue {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

const CalendarDateContext = createContext<CalendarDateContextValue | null>(null);

export function CalendarDateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  return (
    <CalendarDateContext.Provider value={{ selectedDate, setSelectedDate }}>
      {children}
    </CalendarDateContext.Provider>
  );
}

export function useCalendarDate() {
  const ctx = useContext(CalendarDateContext);
  if (!ctx) throw new Error('useCalendarDate must be used within CalendarDateProvider');
  return ctx;
}
