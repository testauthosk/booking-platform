'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  LogIn,
  LogOut,
  Shield,
  Mail,
  Store,
  AlertTriangle,
  ArrowLeft,
  UserCog,
} from 'lucide-react';

interface User {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  salon?: { id: string; name: string; slug: string } | null;
}

interface ImpersonationStatus {
  isImpersonating: boolean;
  originalUser?: { id: string; email: string; name: string | null };
  impersonatedUser?: { id: string; email: string; name: string | null; role: string };
  impersonatedAt?: string;
}

export default function ImpersonatePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ImpersonationStatus>({ isImpersonating: false });
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/admin/impersonate');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error checking impersonation status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const searchUsers = useCallback(async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        type: 'admin',
        limit: '20',
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users.filter((u: User) => u.role !== 'SUPER_ADMIN'));
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const impersonate = async (userId: string) => {
    if (!confirm('Увійти як цей користувач? Ви зможете повернутися назад.')) return;

    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        // Redirect to dashboard as the impersonated user
        window.location.href = '/dashboard';
      } else {
        const error = await res.json();
        alert(error.error || 'Помилка');
      }
    } catch (error) {
      console.error('Error impersonating:', error);
      alert('Помилка');
    }
  };

  const stopImpersonation = async () => {
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Повернуто до адміністратора');
        checkStatus();
      }
    } catch (error) {
      console.error('Error stopping impersonation:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Impersonate</h1>
        <p className="text-gray-400 text-sm">Увійти як інший користувач для діагностики</p>
      </div>

      {/* Warning */}
      <Card className="bg-amber-500/10 border-amber-500/20 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-400">Увага!</p>
            <p className="text-sm text-amber-300/80">
              Ця функція дозволяє увійти як інший користувач без його паролю. 
              Використовуйте тільки для діагностики та підтримки. 
              Всі дії логуються.
            </p>
          </div>
        </div>
      </Card>

      {/* Current Status */}
      {!statusLoading && status.isImpersonating && (
        <Card className="bg-violet-500/10 border-violet-500/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <UserCog className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-violet-300">Зараз ви увійшли як:</p>
                <p className="font-medium text-white">
                  {status.impersonatedUser?.name || status.impersonatedUser?.email}
                </p>
                <p className="text-xs text-gray-500">
                  Оригінал: {status.originalUser?.email}
                </p>
              </div>
            </div>
            <Button
              onClick={stopImpersonation}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Повернутися
            </Button>
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Пошук користувача по email або імені..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
            className="pl-9 bg-[#12121a] border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <Button 
          onClick={searchUsers} 
          disabled={loading}
          className="bg-violet-600 hover:bg-violet-700"
        >
          Шукати
        </Button>
      </div>

      {/* Results */}
      <Card className="bg-[#12121a] border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Пошук...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Введіть email або ім'я для пошуку</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {users.map((user) => (
              <div key={user.id} className="p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <UserCog className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{user.name || 'Без імені'}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </span>
                        {user.salon && (
                          <span className="flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            {user.salon.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.role === 'SUPER_ADMIN'
                        ? 'bg-violet-500/10 text-violet-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {user.role === 'SUPER_ADMIN' ? (
                        <>
                          <Shield className="w-3 h-3" />
                          Super Admin
                        </>
                      ) : (
                        'Власник'
                      )}
                    </span>
                    <Button
                      onClick={() => impersonate(user.id)}
                      disabled={user.role === 'SUPER_ADMIN'}
                      className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Увійти як
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Instructions */}
      <Card className="bg-[#12121a] border-white/5 p-4">
        <h3 className="font-medium text-white mb-2">Як це працює</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>1. Знайдіть користувача по email або імені</li>
          <li>2. Натисніть "Увійти як" для входу</li>
          <li>3. Ви будете перенаправлені в dashboard користувача</li>
          <li>4. Щоб повернутися, зайдіть на цю сторінку і натисніть "Повернутися"</li>
          <li>5. Сесія impersonate діє 2 години</li>
        </ul>
      </Card>
    </div>
  );
}
