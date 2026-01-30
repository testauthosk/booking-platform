"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff, Scissors, LogOut, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Принудительный выход - очищает всё
  const forceLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    // Очищаем localStorage
    localStorage.clear();
    // Перезагружаем страницу
    window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(translateError(error));
      setLoading(false);
      return;
    }

    // После успешного входа перенаправляем в дашборд
    router.push('/dashboard');
  };

  const translateError = (error: string) => {
    if (error.includes('Invalid login credentials')) {
      return 'Неверный email или пароль';
    }
    if (error.includes('Email not confirmed')) {
      return 'Подтвердите email для входа';
    }
    return error;
  };

  // Кнопка выхода всегда видна в углу
  const LogoutButton = () => (
    <button
      onClick={forceLogout}
      className="fixed top-4 right-4 flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors z-50"
    >
      <Trash2 className="w-4 h-4" />
      Сбросить сессию
    </button>
  );

  // При загрузке показываем спиннер + кнопку выхода
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LogoutButton />
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Загрузка...</p>
          <p className="text-gray-400 text-sm mt-2">Если долго грузится - нажмите "Сбросить сессию"</p>
        </div>
      </div>
    );
  }

  // Если залогинен - показать информацию и кнопки
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50 flex items-center justify-center px-4">
        <LogoutButton />
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm mb-4">
            <Scissors className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Вы вошли как</h1>
          <p className="text-gray-700 font-medium">{user.email}</p>
          <p className="text-gray-500 mb-6">
            Роль: {user.role === 'super_admin' ? 'Супер админ' : 'Владелец салона'}
          </p>

          <div className="space-y-3">
            {user.role === 'super_admin' ? (
              <Button
                onClick={() => router.push('/admin')}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl h-12"
              >
                Открыть консоль админа
              </Button>
            ) : (
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-12"
              >
                Открыть панель салона
              </Button>
            )}

            <Button
              onClick={forceLogout}
              variant="outline"
              className="w-full rounded-xl h-12 border-gray-300"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Выйти
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Форма входа
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm mb-4">
            <Scissors className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Панель салона</h1>
          <p className="text-gray-500 mt-2">Войдите для управления вашим салоном</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="salon@example.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-12 text-base font-medium shadow-lg shadow-violet-500/25"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Войти'
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Проблемы с входом? Обратитесь к администратору платформы
        </p>
      </div>
    </div>
  );
}
