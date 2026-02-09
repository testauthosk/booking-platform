// @ts-nocheck
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Key, Shield, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function SecurityPage() {
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  const changePassword = async () => {
    setError('');
    if (passwordForm.newPass.length < 8) {
      setError('Мінімум 8 символів');
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      setError('Паролі не збігаються');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.newPass,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setPasswordForm({ current: '', newPass: '', confirm: '' });
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Помилка');
      }
    } catch {
      setError('Помилка мережі');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/setup">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Безпека</h1>
          <p className="text-sm text-gray-500">Пароль та захист акаунту</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Change password */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            <h2 className="font-medium">Змінити пароль</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Поточний пароль</label>
              <input
                type="password"
                value={passwordForm.current}
                onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Новий пароль</label>
              <input
                type="password"
                value={passwordForm.newPass}
                onChange={e => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Підтвердіть пароль</label>
              <input
                type="password"
                value={passwordForm.confirm}
                onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {saved && <p className="text-sm text-green-600">✓ Пароль змінено</p>}

          <Button onClick={changePassword} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Змінити пароль
          </Button>
        </Card>

        {/* Danger zone */}
        <Card className="p-5 border-red-200">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="font-medium text-red-600">Небезпечна зона</h2>
          </div>

          {!showDelete ? (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowDelete(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Видалити акаунт
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-600">
                Це видалить ваш акаунт, салон, всі записи, клієнтів та дані безповоротно.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    // TODO: implement delete account API
                    alert('Функція буде доступна незабаром. Зверніться до підтримки.');
                  }}
                >
                  Так, видалити все
                </Button>
                <Button variant="outline" onClick={() => setShowDelete(false)}>
                  Скасувати
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
