'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Database,
  Play,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react';

interface QueryResult {
  success: boolean;
  data?: Record<string, unknown>[];
  rowCount?: number;
  executionTime?: number;
  query?: string;
  error?: string;
}

interface Preset {
  key: string;
  name: string;
  query: string;
}

export default function SqlPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/admin/sql');
      if (res.ok) {
        const data = await res.json();
        setPresets(data.presets);
      }
    } catch (error) {
      console.error('Error fetching presets:', error);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setResult({
          success: true,
          data: data.data,
          rowCount: data.rowCount,
          executionTime: data.executionTime,
          query: data.query,
        });
      } else {
        setResult({
          success: false,
          error: data.error,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Помилка виконання запиту',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (preset: Preset) => {
    setQuery(preset.query);
    setPresetsOpen(false);
    setResult(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getColumnHeaders = (): string[] => {
    if (!result?.data || result.data.length === 0) return [];
    return Object.keys(result.data[0]);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">SQL Console</h1>
        <p className="text-gray-400 text-sm">Виконання read-only SQL запитів</p>
      </div>

      {/* Warning */}
      <Card className="bg-amber-500/10 border-amber-500/20 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-400">Тільки читання!</p>
            <p className="text-sm text-amber-300/80">
              Дозволені тільки SELECT запити. INSERT, UPDATE, DELETE, DROP та інші модифікуючі операції заблоковані.
              Результати обмежені 1000 записами.
            </p>
          </div>
        </div>
      </Card>

      {/* Query Editor */}
      <Card className="bg-[#12121a] border-white/5 p-4 space-y-4">
        {/* Presets dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setPresetsOpen(!presetsOpen)}
            className="bg-transparent border-white/10 text-white hover:bg-white/5"
          >
            <Database className="w-4 h-4 mr-2" />
            Готові запити
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${presetsOpen ? 'rotate-180' : ''}`} />
          </Button>

          {presetsOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-[#1a1a24] border border-white/10 rounded-lg shadow-lg z-10">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => loadPreset(preset)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white first:rounded-t-lg last:rounded-b-lg"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Query input */}
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SELECT * FROM &quot;Salon&quot; LIMIT 10"
          className="w-full h-40 px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50 resize-none"
        />

        {/* Execute button */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Ctrl+Enter для виконання
          </p>
          <Button
            onClick={executeQuery}
            disabled={loading || !query.trim()}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {loading ? 'Виконується...' : 'Виконати'}
          </Button>
        </div>
      </Card>

      {/* Results */}
      {result && (
        <Card className="bg-[#12121a] border-white/5 overflow-hidden">
          {/* Result header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
            {result.success ? (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-400">
                  ✓ {result.rowCount} записів
                </span>
                {result.executionTime && (
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {result.executionTime}ms
                  </span>
                )}
              </div>
            ) : (
              <span className="text-red-400">✕ Помилка</span>
            )}
            
            {result.success && result.data && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(result.data, null, 2))}
                className="text-gray-400 hover:text-white"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            )}
          </div>

          {/* Error message */}
          {!result.success && (
            <div className="p-4 text-red-400 font-mono text-sm">
              {result.error}
            </div>
          )}

          {/* Data table */}
          {result.success && result.data && result.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    {getColumnHeaders().map((col) => (
                      <th key={col} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {result.data.map((row, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      {getColumnHeaders().map((col) => (
                        <td key={col} className="px-4 py-2 text-sm text-gray-300 whitespace-nowrap max-w-xs truncate">
                          {formatValue(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty result */}
          {result.success && result.data && result.data.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Запит виконано, але результатів немає
            </div>
          )}
        </Card>
      )}

      {/* Help */}
      <Card className="bg-[#12121a] border-white/5 p-4">
        <h3 className="font-medium text-white mb-2">Підказки</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Імена таблиць з великої літери в лапках: "Salon", "User", "Booking"</li>
          <li>• Поля в camelCase: "createdAt", "isActive", "salonId"</li>
          <li>• Максимум 1000 записів (LIMIT додається автоматично)</li>
          <li>• Для складних запитів використовуйте CTE (WITH ...)</li>
        </ul>
      </Card>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  if (typeof value === 'object') {
    if (value instanceof Date) {
      return value.toLocaleString('uk-UA');
    }
    return JSON.stringify(value);
  }
  return String(value);
}
