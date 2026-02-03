"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff, Scissors, ArrowRight, Check, Mail, Phone } from 'lucide-react';

// Password strength checker
function checkPasswordStrength(password: string): {
  score: number; // 0-4
  label: string;
  color: string;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length === 0) {
    return { score: 0, label: '', color: '', feedback: [] };
  }

  // Length checks
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (password.length < 6) feedback.push('Мінімум 6 символів');

  // Character variety
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1;
  } else if (password.length >= 6) {
    feedback.push('Додайте великі та малі літери');
  }

  if (/\d/.test(password)) {
    score += 0.5;
  } else if (password.length >= 6) {
    feedback.push('Додайте цифри');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 0.5;
  }

  // Common patterns (reduce score)
  if (/^[0-9]+$/.test(password)) {
    score = Math.max(0, score - 1);
    feedback.push('Не використовуйте тільки цифри');
  }
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 0.5);
  }

  const normalizedScore = Math.min(4, Math.round(score));

  const levels = [
    { label: 'Дуже слабкий', color: 'bg-red-500' },
    { label: 'Слабкий', color: 'bg-orange-500' },
    { label: 'Середній', color: 'bg-yellow-500' },
    { label: 'Хороший', color: 'bg-lime-500' },
    { label: 'Відмінний', color: 'bg-green-500' },
  ];

  return {
    score: normalizedScore,
    label: levels[normalizedScore].label,
    color: levels[normalizedScore].color,
    feedback: feedback.slice(0, 2), // Max 2 suggestions
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [salonName, setSalonName] = useState('');
  const [salonPhone, setSalonPhone] = useState('');
  
  // Auth method
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Password strength
  const passwordStrength = useMemo(() => checkPasswordStrength(password), [password]);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!salonName.trim()) {
      setError('Введіть назву салону');
      return;
    }

    setStep(2);
  };

  const formatPhoneInput = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format: XX XXX XX XX (9 digits after +380)
    let formatted = '';
    if (digits.length > 0) formatted += digits.slice(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
    if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
    
    return formatted;
  };

  const handlePhoneChange = (value: string, setter: (v: string) => void) => {
    const formatted = formatPhoneInput(value);
    setter(formatted);
  };

  const getFullPhone = (phoneValue: string): string => {
    const digits = phoneValue.replace(/\D/g, '');
    return digits ? `+380${digits}` : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (authMethod === 'email' && !email.trim()) {
      setError('Введіть email');
      return;
    }

    if (authMethod === 'phone') {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length !== 9) {
        setError('Введіть повний номер телефону');
        return;
      }
    }

    if (password !== confirmPassword) {
      setError('Паролі не співпадають');
      return;
    }

    if (password.length < 6) {
      setError('Пароль має бути не менше 6 символів');
      return;
    }

    if (!agreed) {
      setError('Прийміть умови використання');
      return;
    }

    setLoading(true);

    try {
      const authValue = authMethod === 'email' ? email.trim() : getFullPhone(phone);
      
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonName: salonName.trim(),
          salonPhone: getFullPhone(salonPhone),
          authMethod,
          email: authMethod === 'email' ? email.trim() : null,
          phone: authMethod === 'phone' ? getFullPhone(phone) : null,
          password,
          name: name.trim(),
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Помилка реєстрації');
        setLoading(false);
        return;
      }

      // Auto login
      const signInResult = await signIn('credentials', {
        email: authMethod === 'email' ? email.trim() : getFullPhone(phone),
        password,
        redirect: false
      });

      if (signInResult?.error) {
        router.push('/login?registered=true');
      } else {
        router.push('/dashboard?welcome=true');
      }

    } catch (err) {
      console.error('Registration error:', err);
      setError('Помилка з\'єднання');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm mb-4">
            <Scissors className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 1 ? 'Створіть акаунт' : 'Ваші дані'}
          </h1>
          <p className="text-gray-500 mt-2">
            {step === 1 
              ? 'Розпочніть керувати своїм салоном' 
              : 'Останній крок — і ви готові'
            }
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 1 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {step > 1 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <div className={`w-12 h-1 rounded ${step >= 2 ? 'bg-violet-600' : 'bg-gray-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 2 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            2
          </div>
        </div>

        {/* Registration Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          
          {/* Step 1: Salon Info */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-5">
              <div>
                <label htmlFor="salonName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Назва салону *
                </label>
                <input
                  id="salonName"
                  type="text"
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  placeholder="Наприклад: Beauty Studio"
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="salonPhone" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Телефон салону
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    +380
                  </span>
                  <input
                    id="salonPhone"
                    type="tel"
                    value={salonPhone}
                    onChange={(e) => handlePhoneChange(e.target.value, setSalonPhone)}
                    placeholder="XX XXX XX XX"
                    maxLength={12}
                    className="w-full pl-16 pr-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-12 text-base font-medium shadow-lg shadow-violet-500/25"
              >
                Далі
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </form>
          )}

          {/* Step 2: Account Info */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Auth Method Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Спосіб входу *
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAuthMethod('email')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      authMethod === 'email'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMethod('phone')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      authMethod === 'phone'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    Телефон
                  </button>
                </div>
              </div>

              {/* Email or Phone */}
              {authMethod === 'email' ? (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    autoComplete="email"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Телефон можна додати пізніше в особистому кабінеті
                  </p>
                </div>
              ) : (
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Номер телефону *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      +380
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value, setPhone)}
                      placeholder="XX XXX XX XX"
                      maxLength={12}
                      autoFocus
                      className="w-full pl-16 pr-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Email можна додати пізніше в особистому кабінеті
                  </p>
                </div>
              )}

              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ваше ім'я
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ім'я та прізвище"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Пароль *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Мінімум 6 символів"
                    required
                    autoComplete="new-password"
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

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-3 space-y-2">
                    {/* Strength Bar */}
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            i < passwordStrength.score
                              ? passwordStrength.color
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    
                    {/* Strength Label */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${
                        passwordStrength.score <= 1 ? 'text-red-500' :
                        passwordStrength.score === 2 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                      {passwordStrength.score >= 3 && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </div>

                    {/* Feedback */}
                    {passwordStrength.feedback.length > 0 && (
                      <ul className="space-y-0.5">
                        {passwordStrength.feedback.map((tip, i) => (
                          <li key={i} className="text-xs text-gray-500 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-gray-400" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Підтвердіть пароль *
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторіть пароль"
                    required
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-gray-900 pr-12 ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : confirmPassword && password === confirmPassword
                        ? 'border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'
                        : 'border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
                    }`}
                  />
                  {confirmPassword && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                      {password === confirmPassword ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <span className="text-red-500 text-sm">✕</span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Agreement */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-600">
                  Я погоджуюсь з{' '}
                  <a href="/terms" className="text-violet-600 hover:underline">умовами використання</a>
                  {' '}та{' '}
                  <a href="/privacy" className="text-violet-600 hover:underline">політикою конфіденційності</a>
                </span>
              </label>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl h-12"
                >
                  Назад
                </Button>
                <Button
                  type="submit"
                  disabled={loading || passwordStrength.score < 1}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-12 text-base font-medium shadow-lg shadow-violet-500/25 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Створити акаунт'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Вже маєте акаунт?{' '}
          <Link href="/login" className="text-violet-600 font-medium hover:underline">
            Увійти
          </Link>
        </p>
      </div>
    </div>
  );
}
