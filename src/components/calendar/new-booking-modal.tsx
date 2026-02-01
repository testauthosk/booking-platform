'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, User, Phone, Scissors, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Resource } from './booking-calendar';

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (booking: {
    clientName: string;
    clientPhone: string;
    serviceName: string;
    start: Date;
    end: Date;
    resourceId: string;
  }) => void;
  slotInfo: { start: Date; end: Date; resourceId?: string } | null;
  resources: Resource[];
  services?: { id: string; name: string; duration: number; price: number }[];
}

const defaultServices = [
  { id: '1', name: 'Стрижка', duration: 60, price: 40 },
  { id: '2', name: 'Фарбування', duration: 120, price: 80 },
  { id: '3', name: 'Манікюр', duration: 60, price: 25 },
  { id: '4', name: 'Укладка', duration: 45, price: 30 },
];

export function NewBookingModal({ 
  isOpen, 
  onClose, 
  onSave, 
  slotInfo, 
  resources,
  services = defaultServices 
}: NewBookingModalProps) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+380 ');
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedResource, setSelectedResource] = useState<string>(slotInfo?.resourceId || '');

  if (!isOpen || !slotInfo) return null;

  const handleSave = () => {
    if (!clientName || !selectedService || !selectedResource) return;

    const service = services.find(s => s.id === selectedService);
    const endTime = new Date(slotInfo.start.getTime() + (service?.duration || 60) * 60000);

    onSave({
      clientName,
      clientPhone,
      serviceName: service?.name || '',
      start: slotInfo.start,
      end: endTime,
      resourceId: selectedResource,
    });

    // Reset form
    setClientName('');
    setClientPhone('+380 ');
    setSelectedService('');
    onClose();
  };

  const formatPhone = (value: string) => {
    // Keep only digits
    let digits = value.replace(/\D/g, '');
    
    // Handle 380 prefix
    if (digits.startsWith('380')) {
      digits = digits.slice(3);
    }
    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    
    // Limit to 9 digits
    digits = digits.slice(0, 9);
    
    // Format
    let formatted = '+380';
    if (digits.length > 0) formatted += ' ' + digits.slice(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
    if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
    
    return formatted;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-4 bottom-4 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md bg-background rounded-2xl shadow-xl z-50 animate-in slide-in-from-bottom-4 lg:slide-in-from-bottom-0 lg:zoom-in-95 duration-200 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Новий запис</h2>
            <p className="text-sm text-muted-foreground">
              {format(slotInfo.start, "EEEE, d MMMM 'о' HH:mm", { locale: uk })}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Client name */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Ім'я клієнта</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Введіть ім'я"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Телефон</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="+380 XX XXX XX XX"
                value={clientPhone}
                onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                className="pl-10"
              />
            </div>
          </div>

          {/* Service */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Послуга</label>
            <div className="grid grid-cols-2 gap-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedService === service.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <p className="font-medium text-sm">{service.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {service.duration} хв · {service.price} €
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Master */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Майстер</label>
            <div className="flex gap-2">
              {resources.map((resource) => (
                <button
                  key={resource.id}
                  onClick={() => setSelectedResource(resource.id)}
                  className={`flex-1 p-3 rounded-xl border text-center transition-all ${
                    selectedResource === resource.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div 
                    className="w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: resource.color || '#8b5cf6' }}
                  >
                    {resource.title[0]}
                  </div>
                  <p className="font-medium text-sm truncate">{resource.title}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex gap-2 shrink-0">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Скасувати
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleSave}
            disabled={!clientName || !selectedService || !selectedResource}
          >
            Зберегти
          </Button>
        </div>
      </div>
    </>
  );
}
