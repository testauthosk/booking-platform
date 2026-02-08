"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff, Scissors, Mail, Phone } from 'lucide-react';

export default function LoginPage() {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhoneInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    let formatted = '';
    if (digits.length > 0) formatted += digits.slice(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
    if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
    return formatted;
  };

  const getFullPhone = (phoneValue: string): string => {
    const digits = phoneValue.replace(/\D/g, '');
    return digits ? `+380${digits}` : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginEmail = authMethod === 'email' 
        ? email.trim() 
        : getFullPhone(phone);

      const result = await signIn('credentials', {
        email: loginEmail,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(authMethod === 'email' 
          ? 'Невірний email або пароль' 
          : 'Невірний номер або пароль');
        setLoading(false);
        return;
      }

      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Login error:', err);
      setError('Помилка підключення до сервера');
      setLoading(false);
    }
  };

  const canSubmit = () => {
    if (authMethod === 'email') return email.trim().length > 0 && password.length > 0;
    return phone.replace(/\D/g, '').length === 9 && password.length > 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm mb-4">
            <Scissors className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Вхід до системи</h1>
          <p className="text-gray-500 mt-2">Введіть дані для входу</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Auth Method Toggle */}
            <div className="relative p-1 bg-gray-100 rounded-xl">
              <div 
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out"
                style={{ left: authMethod === 'email' ? '4px' : 'calc(50%)' }}
              />
              <div className="relative grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMethod('email')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    authMethod === 'email' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('phone')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    authMethod === 'phone' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  Телефон
                </button>
              </div>
            </div>

            {/* Email or Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {authMethod === 'email' ? 'Email' : 'Телефон'}
              </label>
              {authMethod === 'email' ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  autoComplete="email"
                  style={{ fontSize: '16px', height: '50px' }}
                  className="w-full px-4 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
                />
              ) : (
                <div className="relative">
                  <span 
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium"
                    style={{ fontSize: '16px' }}
                  >
                    +380
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                    placeholder="XX XXX XX XX"
                    maxLength={12}
                    autoComplete="tel"
                    style={{ fontSize: '16px', height: '50px' }}
                    className="w-full pl-16 pr-4 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
                  />
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ fontSize: '16px', height: '50px' }}
                  className="w-full px-4 pr-12 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
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
              disabled={loading || !canSubmit()}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-12 text-base font-medium shadow-lg shadow-violet-500/25 disabled:opacity-40"
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
        <p className="text-center text-gray-500 text-sm mt-6">
          Немає акаунту?{' '}
          <Link href="/register" className="text-violet-600 font-medium hover:underline">
            Зареєструватись
          </Link>
        </p>
      </div>
    </div>
  );
}
