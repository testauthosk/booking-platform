'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText, Plus, Save, Trash2, Loader2, Eye, EyeOff, RefreshCw, Edit2, X,
} from 'lucide-react';

interface ContentPageItem {
  id: string;
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

const DEFAULT_PAGES = [
  { slug: 'terms', title: 'Умови використання' },
  { slug: 'privacy', title: 'Політика конфіденційності' },
  { slug: 'faq', title: 'FAQ' },
  { slug: 'about', title: 'Про нас' },
  { slug: 'cookie-policy', title: 'Політика cookies' },
  { slug: 'data-retention', title: 'Зберігання даних' },
];

export default function ContentEditorPage() {
  const [pages, setPages] = useState<ContentPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPublished, setEditPublished] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/content');
      if (res.ok) {
        const data = await res.json();
        setPages(data.pages);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (page: ContentPageItem) => {
    setEditing(page.slug);
    setEditTitle(page.title);
    setEditContent(page.content);
    setEditPublished(page.isPublished);
  };

  const createPage = (slug: string, title: string) => {
    setEditing(slug);
    setEditTitle(title);
    setEditContent('');
    setEditPublished(true);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: editing, title: editTitle, content: editContent, isPublished: editPublished }),
      });
      if (res.ok) {
        setEditing(null);
        load();
      } else alert('Помилка збереження');
    } catch { alert('Помилка'); }
    finally { setSaving(false); }
  };

  const deletePage = async (slug: string) => {
    if (!confirm('Видалити цю сторінку?')) return;
    try {
      const res = await fetch('/api/admin/content', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) load();
    } catch { alert('Помилка'); }
  };

  const existingSlugs = new Set(pages.map(p => p.slug));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-violet-400" /> Контент
          </h1>
          <p className="text-gray-400 text-sm">Terms, Privacy, FAQ — без деплою</p>
        </div>
        <Button variant="outline" className="bg-[#12121a] border-white/10 text-gray-300" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Оновити
        </Button>
      </div>

      {/* Editor */}
      {editing && (
        <Card className="bg-[#12121a] border-violet-500/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Редагування: {editing}</h3>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Заголовок"
            className="bg-[#0a0a0f] border-white/10 text-white"
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Контент сторінки (HTML або Markdown)..."
            rows={16}
            className="w-full bg-[#0a0a0f] text-gray-200 p-4 rounded-lg border border-white/10 focus:border-violet-500 outline-none resize-y text-sm font-mono"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={editPublished}
                onChange={(e) => setEditPublished(e.target.checked)}
                className="rounded bg-[#0a0a0f] border-white/10"
              />
              Опубліковано
            </label>
            <Button onClick={save} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Зберегти
            </Button>
          </div>
        </Card>
      )}

      {/* Existing pages */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <>
          <div className="space-y-2">
            {pages.map(page => (
              <Card key={page.slug} className="bg-[#12121a] border-white/5 p-4 flex items-center gap-4 hover:bg-[#16162a]">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${page.isPublished ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                  {page.isPublished ? <Eye className="w-5 h-5 text-green-400" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{page.title}</p>
                  <p className="text-xs text-gray-500">/{page.slug} · {page.content.length} символів · оновлено {new Date(page.updatedAt).toLocaleDateString('uk-UA')}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="bg-transparent border-white/10 text-gray-400" onClick={() => startEdit(page)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="bg-transparent border-red-500/20 text-red-400" onClick={() => deletePage(page.slug)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Quick create missing defaults */}
          {DEFAULT_PAGES.filter(d => !existingSlugs.has(d.slug)).length > 0 && (
            <Card className="bg-[#12121a] border-white/5 p-4">
              <p className="text-sm text-gray-400 mb-3">Створити стандартні сторінки:</p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_PAGES.filter(d => !existingSlugs.has(d.slug)).map(d => (
                  <Button
                    key={d.slug}
                    variant="outline"
                    size="sm"
                    className="bg-[#0a0a0f] border-white/10 text-gray-300 hover:bg-violet-500/10 hover:text-violet-400"
                    onClick={() => createPage(d.slug, d.title)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> {d.title}
                  </Button>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
