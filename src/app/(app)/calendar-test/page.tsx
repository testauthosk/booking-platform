'use client';

import { useState } from 'react';
import { DayPilotResourceCalendar, CalendarEvent, CalendarResource } from '@/components/calendar/daypilot-resource-calendar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
];

export default function CalendarTestPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    alert(`Клік на запис:\n${event.clientName}\n${event.clientPhone}\n${event.serviceName}`);
  };

  const handleEventMove = (eventId: string, newStart: Date, newEnd: Date, newResourceId: string) => {
    console.log('Event moved:', { eventId, newStart, newEnd, newResourceId });
    alert(`Запис переміщено!\nНовий час: ${newStart.toLocaleTimeString()}\nМайстер: ${newResourceId}`);
  };

  const handleTimeRangeSelect = (start: Date, end: Date, resourceId: string) => {
    console.log('Time range selected:', { start, end, resourceId });
    alert(`Виділено час:\n${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}\nМайстер: ${resourceId}`);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <h1 className="text-xl font-bold">🧪 Тест DayPilot Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => {
            const prev = new Date(selectedDate);
            prev.setDate(prev.getDate() - 1);
            setSelectedDate(prev);
          }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="secondary" onClick={() => setSelectedDate(new Date())}>
            Сьогодні
          </Button>
          <Button variant="outline" size="icon" onClick={() => {
            const next = new Date(selectedDate);
            next.setDate(next.getDate() + 1);
            setSelectedDate(next);
          }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="ml-2 text-sm text-gray-600">
            {selectedDate.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-4">
        <div className="h-full bg-white rounded-xl shadow-sm border overflow-hidden">
          <DayPilotResourceCalendar
            resources={testResources}
            events={testEvents}
            startDate={selectedDate}
            onEventClick={handleEventClick}
            onEventMove={handleEventMove}
            onTimeRangeSelect={handleTimeRangeSelect}
            dayStartHour={8}
            dayEndHour={20}
          />
        </div>
      </div>

      {/* Info */}
      <div className="p-4 bg-white border-t text-sm text-gray-500">
        <p>✅ Клікни на запис — відкриється alert</p>
        <p>✅ Перетягни запис — побачиш нові дані</p>
        <p>✅ Виділи час — створення нового запису</p>
      </div>
    </div>
  );
}
