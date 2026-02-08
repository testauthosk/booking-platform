'use client';

import { useState, useEffect, useRef } from 'react';

const ukDaysShort = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

interface WeekBarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  /** bottom offset in px (default 68 — above MobileNav) */
  bottomOffset?: number;
  /** whether the bar is visible (animates in/out) */
  visible?: boolean;
}

function getWeekDays(date: Date) {
  const days: Date[] = [];
  const current = new Date(date);
  const dayOfWeek = current.getDay();
  const monday = new Date(current);
  monday.setDate(current.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

export function WeekBar({ selectedDate, onDateChange, bottomOffset = 68, visible = true }: WeekBarProps) {
  const weekBarRef = useRef<HTMLDivElement>(null);
  const [weekBarWidth, setWeekBarWidth] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Анімована позиція індикатора
  const [animatedPos, setAnimatedPos] = useState(-1);
  const animFrameRef = useRef<number>(0);
  const prevPosRef = useRef<number>(-1);

  useEffect(() => { setMounted(true); }, []);

  // Вимірюємо ширину
  useEffect(() => {
    if (!mounted || !weekBarRef.current) return;
    setWeekBarWidth(weekBarRef.current.offsetWidth);
    const ro = new ResizeObserver(() => {
      if (weekBarRef.current) setWeekBarWidth(weekBarRef.current.offsetWidth);
    });
    ro.observe(weekBarRef.current);
    return () => ro.disconnect();
  }, [mounted]);

  const weekDays = getWeekDays(selectedDate);
  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const isSelected = (d: Date) => d.toDateString() === selectedDate.toDateString();
  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

  const selectedIdx = weekDays.findIndex(d => isSelected(d));

  // Анімація через requestAnimationFrame
  useEffect(() => {
    if (animatedPos < 0) {
      setAnimatedPos(selectedIdx);
      prevPosRef.current = selectedIdx;
      return;
    }
    if (selectedIdx === prevPosRef.current) return;

    const from = prevPosRef.current;
    const to = selectedIdx;
    prevPosRef.current = to;
    const startTime = performance.now();
    const duration = 280;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimatedPos(from + (to - from) * ease(progress));
      if (progress < 1) animFrameRef.current = requestAnimationFrame(animate);
    };

    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [selectedIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  return (
    <div
      ref={weekBarRef}
      className="lg:hidden fixed left-[23px] right-[23px] z-40 flex items-end touch-none select-none overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{
        bottom: bottomOffset,
        height: '40px', // 32px bar + 8px bump
        background: 'transparent',
        transform: visible ? 'translateY(0)' : 'translateY(calc(100% + 8px))',
      }}
    >
      {/* Єдиний SVG: жовтий фон + білий індикатор + обводка */}
      {weekBarWidth > 0 && (() => {
        const pos = animatedPos >= 0 ? animatedPos : selectedIdx;
        const w = weekBarWidth;
        const barH = 32;
        const bump = 7;
        const cr = 16;
        const curve = 12;
        const cellW = w / 7;
        const indL = pos * cellW;
        const indR = indL + cellW;
        const pad = 1;
        const topY = pad;
        const barTop = bump + pad;
        const totalH = bump + barH + pad;
        const sx = 0.5;

        const safeIndL = Math.max(0, indL);
        const safeIndR = Math.min(w, indR);

        // Жовтий фон
        const yellowLeft = safeIndL > 0
          ? `M 0 ${totalH} L 0 ${barTop + cr} Q 0 ${barTop} ${Math.min(cr, safeIndL)} ${barTop} L ${safeIndL} ${barTop} L ${safeIndL} ${totalH} Z`
          : '';
        const yellowRight = safeIndR < w
          ? `M ${safeIndR} ${totalH} L ${safeIndR} ${barTop} L ${Math.max(safeIndR, w - cr)} ${barTop} Q ${w} ${barTop} ${w} ${barTop + cr} L ${w} ${totalH} Z`
          : '';

        // Білий індикатор
        const whitePath = `
          M ${safeIndL} ${totalH} L ${safeIndL} ${barTop}
          C ${safeIndL} ${barTop} ${safeIndL} ${topY} ${safeIndL + curve} ${topY}
          L ${safeIndR - curve} ${topY}
          C ${safeIndR} ${topY} ${safeIndR} ${barTop} ${safeIndR} ${barTop}
          L ${safeIndR} ${totalH} Z
        `;

        // Обводка
        const leftEnd = sx + cr;
        const rightStart = w - cr - sx;

        let contour = '';
        if (safeIndL > leftEnd) {
          contour = `M ${sx} ${totalH} L ${sx} ${barTop + cr} Q ${sx} ${barTop} ${leftEnd} ${barTop} L ${safeIndL} ${barTop}`;
          contour += ` C ${safeIndL} ${barTop} ${safeIndL} ${topY} ${safeIndL + curve} ${topY}`;
        } else {
          contour = `M ${sx} ${totalH} L ${sx} ${barTop + curve}`;
          contour += ` C ${sx} ${barTop} ${safeIndL} ${topY} ${safeIndL + curve} ${topY}`;
        }
        contour += ` L ${safeIndR - curve} ${topY}`;
        if (safeIndR < rightStart) {
          contour += ` C ${safeIndR} ${topY} ${safeIndR} ${barTop} ${safeIndR} ${barTop}`;
          contour += ` L ${rightStart} ${barTop} Q ${w - sx} ${barTop} ${w - sx} ${barTop + cr}`;
        } else {
          contour += ` C ${safeIndR} ${topY} ${w - sx} ${barTop} ${w - sx} ${barTop + curve}`;
        }
        contour += ` L ${w - sx} ${totalH}`;

        return (
          <svg
            className="absolute pointer-events-none z-[2]"
            style={{ top: 0, left: 0, width: w, height: totalH, overflow: 'hidden' }}
          >
            <defs>
              <clipPath id="weekbar-clip">
                <rect x="1" y="0" width={w - 2} height={totalH - 1} />
              </clipPath>
            </defs>
            <g clipPath="url(#weekbar-clip)">
            {/* Жовті секції (без base rect — щілини прозорі, видно контент за ними) */}
            {yellowLeft && <path d={yellowLeft} fill="#facc15" />}
            {yellowRight && <path d={yellowRight} fill="#facc15" />}
            {/* Білий індикатор */}
            <path d={whitePath} fill="white" />
            {/* Обводка */}
            <path d={contour} fill="none" stroke="black" strokeWidth="1" />
            </g>
          </svg>
        );
      })()}

      {/* Кнопки днів */}
      <div className="relative flex items-center justify-around w-full h-[28px] touch-none overflow-hidden z-[3]">
        {weekDays.map((day, idx) => {
          const dayNum = day.getDate();
          const dayName = ukDaysShort[day.getDay()];
          const sel = isSelected(day);
          const we = isWeekend(day);

          return (
            <button
              key={idx}
              onClick={() => onDateChange(day)}
              className="relative z-10 flex flex-col items-center justify-center flex-1 h-full"
            >
              <span className={`text-[9px] font-medium leading-none transition-colors duration-300 ${
                sel ? 'text-gray-900' : we ? 'text-orange-600' : 'text-gray-600'
              }`}>
                {dayName}
              </span>
              <span className={`text-[13px] font-bold leading-none mt-0.5 transition-colors duration-300 ${
                sel ? 'text-gray-900' : we ? 'text-orange-600' : 'text-gray-800'
              }`}>
                {dayNum}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
