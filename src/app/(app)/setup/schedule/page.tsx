'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Palette } from 'lucide-react';
import Link from 'next/link';
import { COLOR_PALETTES, ColorPalette } from '@/lib/color-palettes';
import { useCalendarSettings } from '@/lib/calendar-settings-context';
import { cn } from '@/lib/utils';

function PaletteCard({ 
  palette, 
  isSelected, 
  onSelect 
}: { 
  palette: ColorPalette; 
  isSelected: boolean; 
  onSelect: () => void;
}) {
  return (
    <Card 
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-base">{palette.name}</h3>
          <p className="text-sm text-muted-foreground">{palette.description}</p>
        </div>
        {isSelected && (
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>
      
      {/* Color preview grid */}
      <div className="grid grid-cols-5 gap-2">
        {palette.colors.map((color, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1">
            <div 
              className="w-full aspect-square rounded-lg shadow-sm border border-black/5"
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">
              {idx + 1}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function ScheduleSettingsPage() {
  const { settings, setPaletteId } = useCalendarSettings();
  const [selectedId, setSelectedId] = useState(settings.paletteId);

  const handleSave = () => {
    setPaletteId(selectedId);
  };

  const hasChanges = selectedId !== settings.paletteId;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/setup">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Планування</h1>
          <p className="text-muted-foreground">Налаштування розкладу та календаря</p>
        </div>
      </div>

      {/* Palette Selection Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Кольорова палітра календаря</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Оберіть палітру кольорів для карток записів у календарі. Кольори автоматично призначаються співробітникам.
        </p>

        <div className="grid gap-4">
          {COLOR_PALETTES.map((palette) => (
            <PaletteCard
              key={palette.id}
              palette={palette}
              isSelected={selectedId === palette.id}
              onSelect={() => setSelectedId(palette.id)}
            />
          ))}
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={handleSave} size="lg" className="shadow-lg">
            <Check className="h-4 w-4 mr-2" />
            Зберегти зміни
          </Button>
        </div>
      )}
    </div>
  );
}
