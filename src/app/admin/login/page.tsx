"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff, Shield, LogOut, Scissors } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, signOut, user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Если уже залогинен — сначала выйти, чтобы не было конфликта сессий
    if (user) {
      await signOut();
      // Подождать чтобы сессия очистилась
      await new Promise(r => setTimeout(r, 500));
    }

    const { error } = await signIn(email, password);

    if (error) {
      setError(translateError(error));
      setLoading(false);
      return;
    }

    // Очистить impersonate cookie если есть
    document.cookie = 'admin-impersonate-original=; path=/; max-age=0';

    // После успешного входа перенаправляем в консоль админа
    router.push('/admin');
    router.refresh();
  };

  const translateError = (error: string) => {
    if (error.includes('Invalid login credentials')) {
      return 'Невірний email або пароль';
    }
    if (error.includes('Email not confirmed')) {
      return 'Подтвердите email для входа';
    }
    return 'Помилка входу. Спробуйте ще раз.';
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Если уже залогинен как SUPER_ADMIN — перейти в консоль
  if (user && user.role === 'SUPER_ADMIN') {
    router.push('/admin');
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Для всех остальных (не залогинен / залогинен как owner) — показываем форму

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-violet-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Консоль администратора</h1>
          <p className="text-slate-400 mt-2">Вход для супер администраторов</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@platform.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-colors text-white placeholder-slate-400"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
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
                  className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-colors text-white placeholder-slate-400 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-12 text-base font-medium"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Увійти'
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Доступ только для администраторов платформы
        </p>
      </div>
    </div>
  );
}
