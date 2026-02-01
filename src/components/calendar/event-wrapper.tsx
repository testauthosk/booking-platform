'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useLongPress } from 'use-long-press';
import { BookingEvent } from './booking-calendar';

interface EventWrapperProps {
  event: BookingEvent;
  children: React.ReactNode;
  onResize?: (event: BookingEvent, edge: 'top' | 'bottom', delta: number) => void;
}

export function EventWrapper({ event, children, onResize }: EventWrapperProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState<'top' | 'bottom' | null>(null);
  const [startY, setStartY] = useState(0);
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if mobile/tablet
  const isTouchDevice = typeof window !== 'undefined' && 
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const startResize = useCallback((edge: 'top' | 'bottom', y: number) => {
    setIsResizing(true);
    setResizeEdge(edge);
    setStartY(y);
    
    // Calculate initial time
    const time = edge === 'top' ? event.start : event.end;
    setCurrentTime(time.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }));
    
    // Add vibration feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [event]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isResizing || !resizeEdge) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - startY;
    const deltaMinutes = Math.round(deltaY / 2); // ~2px per minute
    
    // Calculate new time
    const baseTime = resizeEdge === 'top' ? event.start : event.end;
    const newTime = new Date(baseTime.getTime() + deltaMinutes * 60000);
    
    // Round to 15 min
    newTime.setMinutes(Math.round(newTime.getMinutes() / 15) * 15);
    
    setCurrentTime(newTime.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }));
  }, [isResizing, resizeEdge, startY, event]);

  const handleTouchEnd = useCallback(() => {
    if (isResizing && resizeEdge && onResize) {
      // Calculate final delta
      // onResize(event, resizeEdge, finalDelta);
    }
    setIsResizing(false);
    setResizeEdge(null);
    setCurrentTime(null);
  }, [isResizing, resizeEdge, onResize, event]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isResizing, handleTouchMove, handleTouchEnd]);

  // Long press for top edge
  const topLongPress = useLongPress(
    (e) => {
      if (!isTouchDevice) return;
      const touch = (e as any).touches?.[0];
      if (touch) startResize('top', touch.clientY);
    },
    {
      threshold: 500, // 500ms
      captureEvent: true,
      cancelOnMovement: 10,
    }
  );

  // Long press for bottom edge
  const bottomLongPress = useLongPress(
    (e) => {
      if (!isTouchDevice) return;
      const touch = (e as any).touches?.[0];
      if (touch) startResize('bottom', touch.clientY);
    },
    {
      threshold: 500,
      captureEvent: true,
      cancelOnMovement: 10,
    }
  );

  if (!isTouchDevice) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="relative h-full">
      {/* Top resize zone */}
      <div 
        {...topLongPress()}
        className="absolute top-0 left-0 right-0 h-6 z-10 touch-none"
      />
      
      {/* Content */}
      {children}
      
      {/* Bottom resize zone */}
      <div 
        {...bottomLongPress()}
        className="absolute bottom-0 left-0 right-0 h-6 z-10 touch-none"
      />

      {/* Resize indicator */}
      {isResizing && (
        <>
          {/* Time indicator line */}
          <div 
            className="fixed left-0 right-0 h-0.5 bg-primary z-50 pointer-events-none"
            style={{ top: startY }}
          />
          
          {/* Time badge */}
          <div className="fixed left-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium z-50 shadow-lg pointer-events-none"
            style={{ top: startY - 16 }}
          >
            {currentTime}
          </div>
          
          {/* Edge indicator */}
          <div 
            className={`absolute left-0 right-0 h-1 bg-primary rounded-full ${
              resizeEdge === 'top' ? 'top-0' : 'bottom-0'
            }`}
          />
        </>
      )}
    </div>
  );
}
