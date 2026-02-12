"use client";

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff, Scissors, Mail, Phone, ArrowLeft } from 'lucide-react';

type AuthStep = 'input' | 'otp';

export default function LoginPage() {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [authStep, setAuthStep] = useState<AuthStep>('input');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // OTP states
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [tempCode, setTempCode] = useState(''); // Тимчасовий код (поки SMS не працює)
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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

  // After login: redirect to salon subdomain dashboard
  const redirectToDashboard = async () => {
    try {
      const res = await fetch('/api/salon/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.slug) {
          const baseDomain = 'tholim.com';
          window.location.href = `https://${data.slug}.${baseDomain}/dashboard`;
          return;
        }
      }
    } catch {}
    // Fallback: stay on current domain
    window.location.href = '/dashboard';
  };

  // Відправка OTP
  const handleSendOtp = async () => {
    setError('');
    setOtpLoading(true);
    setTempCode('');

    try {
      const phoneNumber = getFullPhone(phone);
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, type: 'login' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Помилка відправки коду');
        setOtpLoading(false);
        return;
      }

      // Якщо код повернуто в response (SMS ще не працює)
      if (data.code) {
        setTempCode(data.code);
      }

      setCountdown(60);
      setAuthStep('otp');
      setOtpCode(['', '', '', '', '', '']);
    } catch (err) {
      console.error('Send OTP error:', err);
      setError('Помилка з\'єднання');
    } finally {
      setOtpLoading(false);
    }
  };

  // Повторна відправка OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    await handleSendOtp();
  };

  // Обробка введення OTP
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);

    // Автофокус на наступне поле
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtpCode(newOtp);
      otpInputsRef.current[5]?.focus();
    }
  };

  // Верифікація OTP та вхід
  const handleVerifyAndLogin = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      setError('Введіть 6-значний код');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const phoneNumber = getFullPhone(phone);

      // Спочатку верифікуємо код
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, code }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyData.error || 'Невірний код');
        if (verifyData.remainingAttempts !== undefined) {
          setError(`Невірний код. Залишилось спроб: ${verifyData.remainingAttempts}`);
        }
        setLoading(false);
        return;
      }

      // Код верифіковано — входимо через NextAuth
      const result = await signIn('credentials', {
        email: phoneNumber,
        password: '__otp__' + code,
        redirect: false,
      });

      if (result?.error) {
        setError('Помилка входу');
        setLoading(false);
        return;
      }

      await redirectToDashboard();
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError('Помилка з\'єднання');
      setLoading(false);
    }
  };

  // Стандартний вхід (email + пароль)
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

      await redirectToDashboard();
    } catch (err) {
      console.error('Login error:', err);
      setError('Помилка підключення до сервера');
      setLoading(false);
    }
  };

  const canSubmitEmail = () => email.trim().length > 0 && password.length > 0;
  const canSendOtp = () => phone.replace(/\D/g, '').length === 9;

  // Повернення на попередній крок
  const handleBack = () => {
    if (authStep === 'otp') {
      setAuthStep('input');
      setOtpCode(['', '', '', '', '', '']);
      setError('');
      setTempCode('');
    }
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
          <p className="text-gray-500 mt-2">
            {authStep === 'otp' ? 'Введіть код з SMS або Telegram' : 'Введіть дані для входу'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          
          {/* OTP Step */}
          {authStep === 'otp' && authMethod === 'phone' ? (
            <div className="space-y-5">
              {/* Back button */}
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Назад
              </button>

              {/* Phone display */}
              <div className="text-center">
                <p className="text-gray-600">
                  Код відправлено на <span className="font-semibold">{getFullPhone(phone)}</span>
                </p>
              </div>

              {/* Temp code display (поки SMS не працює) */}
              {tempCode && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm text-center">
                  <p className="font-medium">SMS сервіс в розробці</p>
                  <p className="mt-1">Ваш код: <span className="font-bold text-lg">{tempCode}</span></p>
                </div>
              )}

              {/* OTP Input */}
              <div className="flex justify-center gap-2">
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpInputsRef.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                  />
                ))}
              </div>

              {/* Resend */}
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-gray-500 text-sm">
                    Надіслати повторно через {countdown} сек
                  </p>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    disabled={otpLoading}
                    className="text-violet-600 font-medium text-sm hover:underline disabled:opacity-50"
                  >
                    {otpLoading ? 'Відправка...' : 'Надіслати код повторно'}
                  </button>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Verify Button */}
              <Button
                type="button"
                onClick={handleVerifyAndLogin}
                disabled={loading || otpCode.join('').length !== 6}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-12 text-base font-medium shadow-lg shadow-violet-500/25 disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Увійти'
                )}
              </Button>
            </div>
          ) : (
            /* Input Step */
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
                    onClick={() => { setAuthMethod('email'); setError(''); }}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      authMethod === 'email' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMethod('phone'); setError(''); }}
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

              {/* Password (only for email) */}
              {authMethod === 'email' && (
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
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Submit */}
              {authMethod === 'email' ? (
                <Button
                  type="submit"
                  disabled={loading || !canSubmitEmail()}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-12 text-base font-medium shadow-lg shadow-violet-500/25 disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Увійти'
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading || !canSendOtp()}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-12 text-base font-medium shadow-lg shadow-violet-500/25 disabled:opacity-40"
                >
                  {otpLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Отримати код'
                  )}
                </Button>
              )}
            </form>
          )}
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
