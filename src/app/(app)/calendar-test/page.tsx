'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Menu, Bell, Plus, Filter } from 'lucide-react';

// Dynamic import з вимкненим SSR — DayPilot потребує window
const DayPilotResourceCalendar = dynamic(
  () => import('@/components/calendar/daypilot-resource-calendar').then(mod => mod.DayPilotResourceCalendar),
  { 
    ssr: false, 
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="text-gray-400">Завантаження...</div></div> 
  }
);

// Тимчасовий fallback для тестування
const SimpleFallback = () => (
  <div className="flex-1 flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <div className="text-lg font-bold text-gray-700">Календар (тест)</div>
      <div className="text-gray-500 mt-2">Компонент завантажується...</div>
    </div>
  </div>
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

// Тестові дані
const testResources: CalendarResource[] = [
  { id: '1', name: 'Андрій', color: '#22c55e' },
  { id: '2', name: 'Данил', color: '#3b82f6' },
  { id: '3', name: 'Сергій', color: '#f97316' },
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
    backColor: '#22c55e',
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
    backColor: '#22c55e',
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
    backColor: '#3b82f6',
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
    backColor: '#3b82f6',
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
    backColor: '#f97316',
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
    backColor: '#f97316',
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
    backColor: '#22c55e',
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
    backColor: '#f97316',
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
    <div className="h-[100dvh] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50">
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
        
        <h1 className="text-lg font-bold text-gray-900">Календар</h1>
        
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50">
            <Bell className="w-5 h-5 text-gray-700" />
          </button>
          <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
            D
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <span className="text-sm font-medium text-gray-700">{formatDate(selectedDate)}</span>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200">
            <Filter className="w-3.5 h-3.5" />
            Усі
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        {/* Тимчасово вимкнено DayPilot для діагностики */}
        <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-4">
          <div className="text-lg font-bold text-gray-700 mb-2">🗓️ Тестовий календар</div>
          <div className="text-gray-500 text-center">
            DayPilot компонент тимчасово вимкнено.<br/>
            Дата: {selectedDate.toLocaleDateString('uk-UA')}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {testResources.map(r => (
              <div key={r.id} className="p-2 rounded-lg text-center text-sm" style={{backgroundColor: r.color + '20', borderLeft: `3px solid ${r.color}`}}>
                {r.name}
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-gray-400">
            {testEvents.length} записів на сьогодні
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-around py-2 bg-white border-t border-gray-200 safe-area-pb">
        <button className="flex flex-col items-center gap-0.5 px-4 py-1 text-yellow-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-medium">Календар</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 px-4 py-1 text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-xs">Графік</span>
        </button>
        
        {/* FAB */}
        <button className="w-14 h-14 -mt-6 bg-gray-900 rounded-full flex items-center justify-center shadow-lg">
          <Plus className="w-7 h-7 text-white" />
        </button>
        
        <button className="flex flex-col items-center gap-0.5 px-4 py-1 text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs">Клієнти</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 px-4 py-1 text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-xs">Більше</span>
        </button>
      </div>
    </div>
  );
}
