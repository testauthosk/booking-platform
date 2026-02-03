'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Upload, 
  FileSpreadsheet, 
  Check, 
  AlertCircle, 
  ArrowRight,
  ArrowLeft,
  Loader2,
  Download,
  ExternalLink
} from 'lucide-react';

// Інструкції експорту для кожної платформи
const exportInstructions: Record<string, { steps: string[]; videoUrl?: string; note?: string }> = {
  altegio: {
    steps: [
      'Відкрийте YCLIENTS → Клієнти',
      'Натисніть "Експорт" у верхньому правому куті',
      'Оберіть формат CSV або Excel',
      'Завантажте файл',
    ],
    note: 'Експорт доступний тільки для адміністраторів',
  },
  booksy: {
    steps: [
      'Відкрийте Booksy Biz → Клієнти',
      'Натисніть ⋮ (три крапки) → Експортувати',
      'Оберіть "Всі клієнти"',
      'Завантажте CSV файл',
    ],
  },
  fresha: {
    steps: [
      'Відкрийте Fresha → Clients',
      'Натисніть Export у верхньому меню',
      'Оберіть формат CSV',
      'Завантажте файл',
    ],
    note: 'Потрібен план Professional або вище',
  },
  other: {
    steps: [
      'Відкрийте вашу поточну систему',
      'Знайдіть розділ "Клієнти" або "Contacts"',
      'Шукайте кнопку "Експорт" або "Export"',
      'Завантажте у форматі CSV або Excel',
    ],
    note: 'Якщо не знайшли експорт — напишіть нам, допоможемо',
  },
};

// Стандартні поля клієнта
const clientFields = [
  { key: 'name', label: "Ім'я", required: true },
  { key: 'phone', label: 'Телефон', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'notes', label: 'Нотатки', required: false },
  { key: 'visitsCount', label: 'Кількість візитів', required: false },
  { key: 'totalSpent', label: 'Загальна сума', required: false },
];

// Автоматичне визначення колонок
const autoDetectColumn = (header: string): string | null => {
  const h = header.toLowerCase().trim();
  
  // Ім'я
  if (['name', 'ім\'я', 'имя', 'client', 'клієнт', 'клиент', 'full name', 'fullname', 'client name'].some(k => h.includes(k))) {
    return 'name';
  }
  // Телефон
  if (['phone', 'телефон', 'mobile', 'мобільний', 'мобильный', 'tel', 'contact'].some(k => h.includes(k))) {
    return 'phone';
  }
  // Email
  if (['email', 'e-mail', 'пошта', 'почта', 'mail'].some(k => h.includes(k))) {
    return 'email';
  }
  // Нотатки
  if (['note', 'notes', 'нотатки', 'заметки', 'comment', 'коментар'].some(k => h.includes(k))) {
    return 'notes';
  }
  // Візити
  if (['visit', 'візит', 'визит', 'appointments', 'bookings', 'записи'].some(k => h.includes(k))) {
    return 'visitsCount';
  }
  // Сума
  if (['total', 'spent', 'сума', 'сумма', 'revenue', 'дохід'].some(k => h.includes(k))) {
    return 'totalSpent';
  }
  
  return null;
};

interface ParsedData {
  headers: string[];
  rows: string[][];
  mapping: Record<string, string>; // columnIndex -> fieldKey
  autoDetected: boolean;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  previousPlatform: string;
  onImport: (clients: Array<{
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    visitsCount?: number;
    totalSpent?: number;
  }>) => Promise<{ imported: number; skipped: number }>;
}

export function ImportModal({ isOpen, onClose, previousPlatform, onImport }: ImportModalProps) {
  const [step, setStep] = useState<'instructions' | 'upload' | 'mapping' | 'importing' | 'done'>('instructions');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const instructions = exportInstructions[previousPlatform] || exportInstructions.other;

  const resetState = () => {
    setStep('instructions');
    setParsedData(null);
    setImportResult(null);
    setError(null);
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error('Файл порожній або містить тільки заголовки');
    }

    // Визначаємо роздільник (кома, крапка з комою, таб)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes(';') && !firstLine.includes(',')) {
      delimiter = ';';
    } else if (firstLine.includes('\t') && !firstLine.includes(',') && !firstLine.includes(';')) {
      delimiter = '\t';
    }

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(parseRow).filter(row => row.some(cell => cell.length > 0));

    return { headers, rows };
  };

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null);
    setIsProcessing(true);

    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);

      // Автовизначення колонок
      const mapping: Record<string, string> = {};
      let autoDetectedCount = 0;

      headers.forEach((header, index) => {
        const detected = autoDetectColumn(header);
        if (detected) {
          mapping[index.toString()] = detected;
          autoDetectedCount++;
        }
      });

      setParsedData({
        headers,
        rows,
        mapping,
        autoDetected: autoDetectedCount >= 2, // Вважаємо успішним якщо знайшли хоча б 2 поля
      });

      setStep('mapping');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка читання файлу');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFileUpload(file);
    } else {
      setError('Підтримуються тільки CSV та Excel файли');
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const updateMapping = (columnIndex: string, fieldKey: string) => {
    if (!parsedData) return;

    const newMapping = { ...parsedData.mapping };
    
    // Видаляємо попереднє призначення цього поля
    Object.keys(newMapping).forEach(key => {
      if (newMapping[key] === fieldKey) {
        delete newMapping[key];
      }
    });

    if (fieldKey) {
      newMapping[columnIndex] = fieldKey;
    } else {
      delete newMapping[columnIndex];
    }

    setParsedData({ ...parsedData, mapping: newMapping });
  };

  const handleImport = async () => {
    if (!parsedData) return;

    const { mapping, rows } = parsedData;
    
    // Перевірка обов'язкових полів
    const hasName = Object.values(mapping).includes('name');
    const hasPhone = Object.values(mapping).includes('phone');
    
    if (!hasName || !hasPhone) {
      setError("Оберіть колонки для Ім'я та Телефон");
      return;
    }

    setStep('importing');
    setError(null);

    try {
      // Конвертуємо рядки в об'єкти клієнтів
      const clients = rows.map(row => {
        const client: Record<string, string | number | undefined> = {};
        
        Object.entries(mapping).forEach(([colIndex, fieldKey]) => {
          const value = row[parseInt(colIndex)];
          if (value) {
            if (fieldKey === 'visitsCount' || fieldKey === 'totalSpent') {
              client[fieldKey] = parseInt(value.replace(/\D/g, '')) || 0;
            } else {
              client[fieldKey] = value;
            }
          }
        });

        return client as {
          name: string;
          phone: string;
          email?: string;
          notes?: string;
          visitsCount?: number;
          totalSpent?: number;
        };
      }).filter(c => c.name && c.phone);

      const result = await onImport(clients);
      setImportResult(result);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка імпорту');
      setStep('mapping');
    }
  };

  const getMappedField = (columnIndex: number): string => {
    return parsedData?.mapping[columnIndex.toString()] || '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'instructions' && 'Як експортувати клієнтів'}
            {step === 'upload' && 'Завантажте файл'}
            {step === 'mapping' && 'Налаштування полів'}
            {step === 'importing' && 'Імпортуємо...'}
            {step === 'done' && 'Готово!'}
          </DialogTitle>
        </DialogHeader>

        {/* Step: Instructions */}
        {step === 'instructions' && (
          <div className="space-y-4">
            <div className="space-y-3">
              {instructions.steps.map((stepText, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-medium text-primary">
                    {idx + 1}
                  </div>
                  <p className="text-sm pt-0.5">{stepText}</p>
                </div>
              ))}
            </div>

            {instructions.note && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-amber-700 dark:text-amber-400">{instructions.note}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Скасувати
              </Button>
              <Button onClick={() => setStep('upload')} className="gap-2">
                Далі
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
            >
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  {isProcessing ? (
                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="h-10 w-10 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">
                      {isProcessing ? 'Обробляємо...' : 'Перетягніть файл сюди'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      або натисніть щоб обрати (CSV, Excel)
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep('instructions')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
            </div>
          </div>
        )}

        {/* Step: Mapping */}
        {step === 'mapping' && parsedData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Знайдено {parsedData.rows.length} рядків
              </p>
              {parsedData.autoDetected && (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Автовизначено
                </span>
              )}
            </div>

            {/* Mapping table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Колонка у файлі</th>
                      <th className="text-left p-2 font-medium">Поле в системі</th>
                      <th className="text-left p-2 font-medium">Приклад</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.headers.map((header, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2 font-mono text-xs">{header}</td>
                        <td className="p-2">
                          <Select
                            value={getMappedField(idx)}
                            onValueChange={(value) => updateMapping(idx.toString(), value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Пропустити" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Пропустити</SelectItem>
                              {clientFields.map((field) => (
                                <SelectItem key={field.key} value={field.key}>
                                  {field.label} {field.required && '*'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground truncate max-w-[150px]">
                          {parsedData.rows[0]?.[idx] || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep('upload')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Інший файл
              </Button>
              <Button onClick={handleImport} className="gap-2">
                Імпортувати {parsedData.rows.length} клієнтів
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="font-medium">Імпортуємо клієнтів...</p>
            <p className="text-sm text-muted-foreground">Це може зайняти кілька секунд</p>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && importResult && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="font-semibold text-lg">Імпорт завершено!</p>
              <p className="text-muted-foreground">
                Додано {importResult.imported} клієнтів
              </p>
              {importResult.skipped > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Пропущено {importResult.skipped} (дублікати або некоректні дані)
                </p>
              )}
            </div>

            <div className="flex justify-center pt-4">
              <Button onClick={handleClose}>
                Готово
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
