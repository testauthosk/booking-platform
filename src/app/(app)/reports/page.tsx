'use client';

import { Card } from '@/components/ui/card';
import { 
  List, 
  Star, 
  Monitor, 
  BarChart3, 
  Crown, 
  Settings,
  Target,
  ChevronRight,
  FolderPlus
} from 'lucide-react';

const reportCategories = [
  { icon: List, label: 'Всі звіти', count: 52 },
  { icon: Star, label: 'Обране', count: 0 },
  { icon: Monitor, label: 'Робочі столи', count: 2 },
  { icon: BarChart3, label: 'Стандарт', count: 44 },
  { icon: Crown, label: 'Преміум', count: 8 },
  { icon: Settings, label: 'Налаштувати', count: 0 },
  { icon: Target, label: 'Цілі', count: null },
];

export default function ReportsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Звіти</h1>

      <Card className="divide-y">
        {reportCategories.map((category) => (
          <div 
            key={category.label}
            className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <category.icon className="h-5 w-5 text-muted-foreground" />
              <span>{category.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {category.count !== null && (
                <span className="text-muted-foreground">{category.count}</span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </Card>

      <div className="mt-6">
        <h2 className="font-medium mb-4">Папки</h2>
        <Card className="p-4">
          <button className="flex items-center gap-2 text-primary">
            <FolderPlus className="h-4 w-4" />
            Додати папку
          </button>
        </Card>
      </div>
    </div>
  );
}
