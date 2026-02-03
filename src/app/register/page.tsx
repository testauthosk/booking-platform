"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { 
  Loader2, Eye, EyeOff, Scissors, ArrowRight, ArrowLeft, Check, Mail, Phone,
  Sparkles, Heart, Flower2, Dumbbell, Sun, Palette, Stethoscope, PawPrint, Grid3X3,
  User, Users, Building2, Car, Monitor
} from 'lucide-react';

// ===== Password Strength =====
function checkPasswordStrength(password: string) {
  const feedback: string[] = [];
  let score = 0;

  if (password.length === 0) return { score: 0, label: '', color: '', feedback: [] };

  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (password.length < 6) feedback.push('Мінімум 6 символів');

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1;
  } else if (password.length >= 6) {
    feedback.push('Додайте великі та малі літери');
  }

  if (/\d/.test(password)) score += 0.5;
  else if (password.length >= 6) feedback.push('Додайте цифри');

  if (/[^a-zA-Z0-9]/.test(password)) score += 0.5;
  if (/^[0-9]+$/.test(password)) score = Math.max(0, score - 1);

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
    feedback: feedback.slice(0, 2),
  };
}

// ===== Business Categories =====
const BUSINESS_CATEGORIES = [
  { id: 'barbershop', name: 'Барбершоп', icon: Scissors },
  { id: 'nails', name: 'Манікюр', icon: Sparkles },
  { id: 'brows', name: 'Брови та вії', icon: Eye },
  { id: 'beauty', name: 'Салон краси', icon: Heart },
  { id: 'spa', name: 'Спа & масаж', icon: Flower2 },
  { id: 'fitness', name: 'Фітнес', icon: Dumbbell },
  { id: 'tanning', name: 'Солярій', icon: Sun },
  { id: 'tattoo', name: 'Тату & пірсинг', icon: Palette },
  { id: 'medical', name: 'Медичні послуги', icon: Stethoscope },
  { id: 'pets', name: 'Грумінг', icon: PawPrint },
  { id: 'other', name: 'Інше', icon: Grid3X3 },
];

// ===== Software Options =====
const SOFTWARE_OPTIONS = [
  'Altegio / YCLIENTS',
  'Booksy',
  'Fresha',
  'Calendly',
  'Square',
  'Mindbody',
  'Vagaro',
  'Setmore',
  'Timely',
  'Treatwell',
  'Salon Iris',
  'Інше',
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 7;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Auth
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Company
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');

  // Step 3: Categories
  const [categories, setCategories] = useState<string[]>([]);

  // Step 4: Account type
  const [accountType, setAccountType] = useState<'solo' | 'team' | null>(null);

  // Step 5: Service location
  const [serviceLocation, setServiceLocation] = useState<string | null>(null);

  // Step 6: Current software
  const [currentSoftware, setCurrentSoftware] = useState<string | null>(null);

  const passwordStrength = useMemo(() => checkPasswordStrength(password), [password]);

  // Phone formatting
  const formatPhoneInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    let formatted = '';
    if (digits.length > 0) formatted += digits.slice(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
    if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
    return formatted;
  };

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhoneInput(value));
  };

  const getFullPhone = (phoneValue: string): string => {
    const digits = phoneValue.replace(/\D/g, '');
    return digits ? `+380${digits}` : '';
  };

  // Validation
  const canProceed = () => {
    switch (step) {
      case 1:
        if (authMethod === 'email' && !email.trim()) return false;
        if (authMethod === 'phone' && phone.replace(/\D/g, '').length !== 9) return false;
        if (password.length < 6) return false;
        if (password !== confirmPassword) return false;
        return true;
      case 2: return companyName.trim().length > 0;
      case 3: return categories.length > 0;
      case 4: return accountType !== null;
      case 5: return serviceLocation !== null;
      case 6: return currentSoftware !== null;
      default: return true;
    }
  };

  const toggleCategory = (id: string) => {
    if (categories.includes(id)) {
      setCategories(categories.filter(c => c !== id));
    } else if (categories.length < 3) {
      setCategories([...categories, id]);
    }
  };

  // Submit registration after step 1
  const handleRegister = async () => {
    setError('');
    setLoading(true);

    try {
      const authValue = authMethod === 'email' ? email.trim() : getFullPhone(phone);
      
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonName: 'Мій салон', // Тимчасова назва
          authMethod,
          email: authMethod === 'email' ? email.trim() : null,
          phone: authMethod === 'phone' ? getFullPhone(phone) : null,
          password,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Помилка реєстрації');
        setLoading(false);
        return false;
      }

      // Auto login
      const signInResult = await signIn('credentials', {
        email: authValue,
        password,
        redirect: false
      });

      if (signInResult?.error) {
        setError('Помилка входу');
        setLoading(false);
        return false;
      }

      setLoading(false);
      return true;

    } catch (err) {
      console.error('Registration error:', err);
      setError('Помилка з\'єднання');
      setLoading(false);
      return false;
    }
  };

  const handleNext = async () => {
    setError('');

    // After step 1, register the user
    if (step === 1) {
      const success = await handleRegister();
      if (!success) return;
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Finish - go to dashboard
      router.push('/dashboard?welcome=true');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50">
      {/* Header - тільки для кроків 2+ */}
      {step > 1 && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
          {/* Progress Bar (6 кроків після реєстрації) */}
          <div className="flex gap-1.5 px-6 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i < step - 1 ? 'bg-violet-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>

            {/* Кнопка "Далі" тільки для кроків 2-6 */}
            {step < totalSteps && (
              <button
                onClick={handleNext}
                disabled={!canProceed() || loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-full font-medium hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Далі
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
            
            {step === totalSteps && <div className="w-20" />}
          </div>
        </header>
      )}

      {/* Content */}
      <main className={`pb-12 px-6 max-w-2xl mx-auto ${step === 1 ? 'pt-12' : 'pt-32'}`}>
        
        {/* ===== STEP 1: Auth ===== */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm mb-4">
                <Scissors className="w-8 h-8 text-violet-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Створіть акаунт</h1>
              <p className="text-gray-500 mt-2">Розпочніть керувати своїм салоном</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 space-y-5">
              {/* Auth Method Toggle - з анімованим слайдером */}
              <div className="relative p-1 bg-gray-100 rounded-xl">
                {/* Sliding indicator */}
                <div 
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out"
                  style={{ left: authMethod === 'email' ? '4px' : 'calc(50% + 0px)' }}
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

              {/* Email or Phone - тільки fade, без руху */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {authMethod === 'email' ? 'Email' : 'Телефон'} *
                </label>
                
                {/* Email input */}
                <div className={`transition-opacity duration-200 ${
                  authMethod === 'email' ? 'opacity-100' : 'opacity-0 absolute inset-0 top-6 pointer-events-none'
                }`}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
                  />
                </div>
                
                {/* Phone input */}
                <div className={`transition-opacity duration-200 ${
                  authMethod === 'phone' ? 'opacity-100' : 'opacity-0 absolute inset-0 top-6 pointer-events-none'
                }`}>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">+380</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="XX XXX XX XX"
                      maxLength={12}
                      className="w-full pl-16 pr-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Пароль *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Мінімум 6 символів"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 pr-14"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password Strength */}
                {password && (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            i < passwordStrength.score ? passwordStrength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${
                        passwordStrength.score <= 1 ? 'text-red-500' :
                        passwordStrength.score === 2 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Підтвердіть пароль *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторіть пароль"
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-gray-900 pr-20 ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : confirmPassword && password === confirmPassword
                        ? 'border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'
                        : 'border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {confirmPassword && (
                      <span>
                        {password === confirmPassword ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <span className="text-red-500 text-lg">✕</span>
                        )}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
              )}

              {/* Кнопка Створити внизу */}
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed() || loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Створити акаунт
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-gray-500 text-sm">
              Вже маєте акаунт?{' '}
              <Link href="/login" className="text-violet-600 font-medium hover:underline">Увійти</Link>
            </p>
          </div>
        )}

        {/* ===== STEP 2: Company Name ===== */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <p className="text-violet-600 text-sm font-medium mb-2">Налаштування</p>
              <h1 className="text-3xl font-bold text-gray-900">Як називається ваша компанія?</h1>
              <p className="text-gray-500 mt-3">Цю назву бачитимуть ваші клієнти</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Назва компанії *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Beauty Studio"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Сайт <span className="text-gray-400">(необов'язково)</span>
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="www.yoursite.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 3: Categories ===== */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <p className="text-violet-600 text-sm font-medium mb-2">Налаштування</p>
              <h1 className="text-3xl font-bold text-gray-900">Оберіть тип вашого бізнесу</h1>
              <p className="text-gray-500 mt-3">Оберіть до 3 категорій</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {BUSINESS_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = categories.includes(cat.id);
                const isFirst = categories[0] === cat.id;
                
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    disabled={!isSelected && categories.length >= 3}
                    className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-500/10'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    } ${!isSelected && categories.length >= 3 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`font-medium text-sm ${isSelected ? 'text-violet-700' : 'text-gray-700'}`}>
                      {cat.name}
                    </span>
                    
                    {isFirst && (
                      <span className="absolute -top-2 -right-2 text-xs bg-violet-500 text-white px-2 py-0.5 rounded-full shadow">
                        Основний
                      </span>
                    )}
                    
                    {isSelected && !isFirst && (
                      <Check className="absolute top-2 right-2 w-5 h-5 text-violet-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== STEP 4: Account Type ===== */}
        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <p className="text-violet-600 text-sm font-medium mb-2">Налаштування</p>
              <h1 className="text-3xl font-bold text-gray-900">Як ви працюєте?</h1>
              <p className="text-gray-500 mt-3">Це допоможе налаштувати ваш акаунт</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setAccountType('solo')}
                className={`flex flex-col items-center gap-4 p-8 rounded-2xl border-2 transition-all ${
                  accountType === 'solo'
                    ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-500/10'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  accountType === 'solo' ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <User className="w-8 h-8" />
                </div>
                <span className={`font-semibold text-lg ${accountType === 'solo' ? 'text-violet-700' : 'text-gray-700'}`}>
                  Я працюю сам
                </span>
              </button>

              <button
                onClick={() => setAccountType('team')}
                className={`flex flex-col items-center gap-4 p-8 rounded-2xl border-2 transition-all ${
                  accountType === 'team'
                    ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-500/10'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  accountType === 'team' ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Users className="w-8 h-8" />
                </div>
                <span className={`font-semibold text-lg ${accountType === 'team' ? 'text-violet-700' : 'text-gray-700'}`}>
                  У мене є команда
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 5: Service Location ===== */}
        {step === 5 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <p className="text-violet-600 text-sm font-medium mb-2">Налаштування</p>
              <h1 className="text-3xl font-bold text-gray-900">Де ви надаєте послуги?</h1>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-2 space-y-2">
              {[
                { id: 'physical', label: 'Клієнти приходять до мене', sublabel: 'Салон, студія, кабінет', icon: Building2 },
                { id: 'mobile', label: 'Виїзд до клієнта', sublabel: 'Працюю на виїзді', icon: Car },
                { id: 'online', label: 'Онлайн послуги', sublabel: 'Консультації, навчання', icon: Monitor },
              ].map((option) => {
                const Icon = option.icon;
                const isSelected = serviceLocation === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setServiceLocation(option.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left ${
                      isSelected
                        ? 'bg-violet-50 border-2 border-violet-500'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <span className={`font-medium block ${isSelected ? 'text-violet-700' : 'text-gray-900'}`}>
                        {option.label}
                      </span>
                      <span className="text-sm text-gray-500">{option.sublabel}</span>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== STEP 6: Current Software ===== */}
        {step === 6 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <p className="text-violet-600 text-sm font-medium mb-2">Налаштування</p>
              <h1 className="text-3xl font-bold text-gray-900">Чим ви користуєтесь зараз?</h1>
              <p className="text-gray-500 mt-3">Ми допоможемо перенести ваші дані</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4">
              <div className="grid grid-cols-2 gap-2">
                {SOFTWARE_OPTIONS.map((software) => {
                  const isSelected = currentSoftware === software;
                  return (
                    <button
                      key={software}
                      onClick={() => setCurrentSoftware(software)}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left text-sm ${
                        isSelected
                          ? 'bg-violet-500 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-white bg-white' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                      </div>
                      <span className="truncate">{software}</span>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 mt-4 pt-4">
                <button
                  onClick={() => setCurrentSoftware('none')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                    currentSoftware === 'none'
                      ? 'bg-violet-500 text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    currentSoftware === 'none' ? 'border-white bg-white' : 'border-gray-300'
                  }`}>
                    {currentSoftware === 'none' && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                  </div>
                  <span>Нічим не користуюсь</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 7: Done ===== */}
        {step === 7 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-8 shadow-2xl shadow-violet-500/30">
              <Check className="w-12 h-12 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Все готово! 🎉</h1>
            <p className="text-gray-500 mb-8 max-w-sm">Ваш акаунт налаштовано. Час почати працювати!</p>
            
            <button
              onClick={handleNext}
              className="px-8 py-3.5 bg-violet-600 text-white rounded-full font-medium hover:bg-violet-700 transition-colors shadow-lg shadow-violet-500/25"
            >
              Перейти до кабінету
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
