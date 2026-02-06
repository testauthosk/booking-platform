'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Menu, Bell, Plus } from 'lucide-react';
import { useCalendarSettings } from '@/lib/calendar-settings-context';

// Dynamic import з вимкненим SSR — DayPilot потребує window
const DayPilotResourceCalendar = dynamic(
  () => import('@/components/calendar/daypilot-resource-calendar').then(mod => mod.DayPilotResourceCalendar),
  { 
    ssr: false, 
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="text-gray-400">Завантаження...</div></div> 
  }
);

// Типи
interface CalendarEvent {
  id: string;
  text: string;
  start: string;
  end: string;
  resource: string;
  backColor?: string;
  clientName?: string;
  clientPhone?: string;
  serviceName?: string;
  isNewClient?: boolean;
}

interface CalendarResource {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
}

// Тестові дані (кольори призначаються динамічно з палітри)
const testResourcesBase = [
  { id: '1', name: 'Андрій' },
  { id: '2', name: 'Данил' },
  { id: '3', name: 'Сергій' },
];

const today = new Date();
const dateStr = today.toISOString().split('T')[0];

const testEvents: CalendarEvent[] = [
  {
    id: '1',
    text: 'Стрижка',
    start: `${dateStr}T10:00:00`,
    end: `${dateStr}T11:00:00`,
    resource: '1',
    
    clientName: 'Костян',
    clientPhone: '+380 98 478-85-13',
    serviceName: 'Стрижка',
    isNewClient: false,
  },
  {
    id: '2',
    text: 'Стрижка + борода',
    start: `${dateStr}T11:30:00`,
    end: `${dateStr}T13:00:00`,
    resource: '1',
    
    clientName: 'Микола',
    clientPhone: '+380 50 591-94-39',
    serviceName: 'Стрижка + борода',
    isNewClient: true,
  },
  {
    id: '3',
    text: 'Стрижка',
    start: `${dateStr}T10:30:00`,
    end: `${dateStr}T11:30:00`,
    resource: '2',
    
    clientName: 'Володимир',
    clientPhone: '+380 63 777-01-75',
    serviceName: 'Стрижка',
    isNewClient: false,
  },
  {
    id: '4',
    text: 'Buzz cut',
    start: `${dateStr}T14:00:00`,
    end: `${dateStr}T14:45:00`,
    resource: '2',
    
    clientName: 'Дмитро',
    clientPhone: '+380 66 744-41-90',
    serviceName: 'Buzz cut',
    isNewClient: true,
  },
  {
    id: '5',
    text: 'Стрижка',
    start: `${dateStr}T09:00:00`,
    end: `${dateStr}T10:00:00`,
    resource: '3',
    
    clientName: 'Артем',
    clientPhone: '+380 93 558-47-92',
    serviceName: 'Стрижка',
    isNewClient: false,
  },
  {
    id: '6',
    text: 'Стрижка + борода',
    start: `${dateStr}T12:00:00`,
    end: `${dateStr}T13:30:00`,
    resource: '3',
    
    clientName: 'Саша Порт',
    clientPhone: '+380 63 707-32-19',
    serviceName: 'Стрижка + борода',
    isNewClient: false,
  },
  {
    id: '7',
    text: 'Камуфляж',
    start: `${dateStr}T15:00:00`,
    end: `${dateStr}T16:00:00`,
    resource: '1',
    
    clientName: 'Валентин',
    clientPhone: '+380 68 365-49-32',
    serviceName: 'Камуфляж',
    isNewClient: true,
  },
  {
    id: '8',
    text: 'Стрижка',
    start: `${dateStr}T16:30:00`,
    end: `${dateStr}T17:30:00`,
    resource: '3',
    
    clientName: 'Ник',
    clientPhone: '+380 50 123-45-67',
    serviceName: 'Ник лис',
    isNewClient: false,
  },
];

// Українські місяці
const ukMonths = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 
                  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

export default function CalendarTestPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { getColorForIndex, settings } = useCalendarSettings();

  // Ресурси з кольорами з палітри салону
  const testResources = useMemo(() => 
    testResourcesBase.map((r, idx) => ({
      ...r,
      color: getColorForIndex(idx),
    })),
    [settings.paletteId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Кольори для подій
  const eventColors = useMemo(() => {
    const colors: Record<string, string> = {};
    testResourcesBase.forEach((r, idx) => {
      colors[r.id] = getColorForIndex(idx);
    });
    return colors;
  }, [settings.paletteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEventClick = (event: CalendarEvent) => {
    alert(`Клік на запис:\n${event.clientName}\n${event.clientPhone}\n${event.serviceName}`);
  };

  const handleEventMove = (eventId: string, newStart: Date, newEnd: Date, newResourceId: string) => {
    const resource = testResources.find(r => r.id === newResourceId);
    alert(`Запис переміщено!\nЧас: ${newStart.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })} - ${newEnd.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}\nМайстер: ${resource?.name || newResourceId}`);
  };

  const handleTimeRangeSelect = (start: Date, end: Date, resourceId: string) => {
    const resource = testResources.find(r => r.id === resourceId);
    alert(`Новий запис:\n${start.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}\nМайстер: ${resource?.name || resourceId}`);
  };

  const formatDate = (date: Date) => {
    return `${date.getDate()} ${ukMonths[date.getMonth()]}`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header — only on mobile */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50">
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
        
        <h1 className="text-lg font-bold text-gray-900">Календар</h1>
        
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50">
            <Bell className="w-5 h-5 text-gray-700" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
            D
          </div>
        </div>
      </div>

      {/* Filter bar - hidden for now */}

      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        <DayPilotResourceCalendar
          resources={testResources}
          events={testEvents}
          startDate={selectedDate}
          onDateChange={setSelectedDate}
          onEventClick={handleEventClick}
          onEventMove={handleEventMove}
          onTimeRangeSelect={handleTimeRangeSelect}
          dayStartHour={8}
          dayEndHour={20}
        />
      </div>

      {/* Bottom navigation removed - using global MobileNav from layout */}
    </div>
  );
}
