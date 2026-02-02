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

interface ProviderProps {
  children: ReactNode;
  salonId?: string;
}

export function CalendarSettingsProvider({ children, salonId }: ProviderProps) {
  const [settings, setSettings] = useState<CalendarSettings>({
    paletteId: DEFAULT_PALETTE_ID,
    colors: getPaletteColors(DEFAULT_PALETTE_ID),
  });

  // Load palette from DB (if salonId) or localStorage
  useEffect(() => {
    const loadPalette = async () => {
      if (salonId) {
        // Load from DB
        try {
          const res = await fetch(`/api/salon/palette?salonId=${salonId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.paletteId) {
              setSettings({
                paletteId: data.paletteId,
                colors: getPaletteColors(data.paletteId),
              });
              return;
            }
          }
        } catch (e) {
          console.error('Failed to load palette from DB:', e);
        }
      }
      
      // Fallback to localStorage
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
    };
    
    loadPalette();
  }, [salonId]);

  const setPaletteId = async (id: string) => {
    const newSettings = {
      paletteId: id,
      colors: getPaletteColors(id),
    };
    setSettings(newSettings);
    
    // Save to DB if salonId exists
    if (salonId) {
      try {
        await fetch('/api/salon/palette', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ salonId, paletteId: id })
        });
      } catch (e) {
        console.error('Failed to save palette to DB:', e);
      }
    }
    
    // Also save to localStorage as backup
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
