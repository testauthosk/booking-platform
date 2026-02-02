'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DEFAULT_PALETTE_ID, getPaletteColors } from './color-palettes';

interface CalendarSettings {
  paletteId: string;
  colors: string[];
}

interface CalendarSettingsContextType {
  settings: CalendarSettings;
  setPaletteId: (id: string) => void;
  getColorForIndex: (index: number) => string;
}

const CalendarSettingsContext = createContext<CalendarSettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'booking-calendar-settings';

export function CalendarSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CalendarSettings>({
    paletteId: DEFAULT_PALETTE_ID,
    colors: getPaletteColors(DEFAULT_PALETTE_ID),
  });

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.paletteId) {
          setSettings({
            paletteId: parsed.paletteId,
            colors: getPaletteColors(parsed.paletteId),
          });
        }
      } catch (e) {
        console.error('Failed to parse calendar settings:', e);
      }
    }
  }, []);

  const setPaletteId = (id: string) => {
    const newSettings = {
      paletteId: id,
      colors: getPaletteColors(id),
    };
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ paletteId: id }));
  };

  const getColorForIndex = (index: number): string => {
    return settings.colors[index % settings.colors.length];
  };

  return (
    <CalendarSettingsContext.Provider value={{ settings, setPaletteId, getColorForIndex }}>
      {children}
    </CalendarSettingsContext.Provider>
  );
}

export function useCalendarSettings() {
  const context = useContext(CalendarSettingsContext);
  if (!context) {
    throw new Error('useCalendarSettings must be used within CalendarSettingsProvider');
  }
  return context;
}
