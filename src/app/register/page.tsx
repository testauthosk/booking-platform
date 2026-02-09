"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Loader2, Scissors, ArrowRight, ArrowLeft, Check, Mail, Phone,
  Sparkles, Heart, Flower2, Dumbbell, Sun, Palette, Stethoscope, PawPrint, Grid3X3,
  User, Users, Building2, Car, Monitor, Eye, EyeOff, MessageCircle
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
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const totalSteps = 7;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progressLoaded, setProgressLoaded] = useState(false);

  // Завантажуємо прогрес якщо юзер вже залогінений
  useEffect(() => {
    if (!session?.user || progressLoaded) return;
    
    const loadProgress = async () => {
      try {
        const res = await fetch('/api/salon/onboarding');
        if (!res.ok) return;
        const { completed, data } = await res.json();
        
        if (completed) {
          router.push('/dashboard');
          return;
        }

        // Відновлюємо дані
        if (data?.companyName) setCompanyName(data.companyName);
        if (data?.website) setWebsite(data.website);
        if (data?.categories) setCategories(data.categories);
        if (data?.accountType) setAccountType(data.accountType);
        if (data?.serviceLocation) setServiceLocation(data.serviceLocation);
        if (data?.previousPlatform) {
          const slugToSoftware: Record<string, string> = {
            altegio: 'Altegio / YCLIENTS', booksy: 'Booksy', fresha: 'Fresha',
            calendly: 'Calendly', square: 'Square', mindbody: 'Mindbody',
            vagaro: 'Vagaro', setmore: 'Setmore', timely: 'Timely',
            treatwell: 'Treatwell', salonIris: 'Salon Iris', other: 'Інше', none: 'none',
          };
          setCurrentSoftware(slugToSoftware[data.previousPlatform] || null);
        }

        if (data?.lastStep && data.lastStep >= 2) {
          setStep(data.lastStep + 1);
        } else {
          setStep(2);
        }
      } catch (e) {
        console.error('Failed to load onboarding progress:', e);
      } finally {
        setProgressLoaded(true);
      }
    };

    loadProgress();
  }, [session, progressLoaded, router]);

  // Step 1: Auth
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('phone');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP states (shared for phone and email)
  const [otpStep, setOtpStep] = useState<'input' | 'verify'>('input');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [tempCode, setTempCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Step 2: Company name
  const [companyName, setCompanyName] = useState('');
  // Step 2: Website
  const [website, setWebsite] = useState('');

  // Step 3: Categories
  const [categories, setCategories] = useState<string[]>([]);

  // Step 4: Account type
  const [accountType, setAccountType] = useState<'solo' | 'team' | null>(null);

  // Step 5: Service location
  const [serviceLocation, setServiceLocation] = useState<string | null>(null);

  // Step 6: Current software
  const [currentSoftware, setCurrentSoftware] = useState<string | null>(null);

  // Step 7: Telegram link
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);

  const passwordStrength = useMemo(() => checkPasswordStrength(password), [password]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
    setPhoneVerified(false);
  };

  const getFullPhone = (phoneValue: string): string => {
    const digits = phoneValue.replace(/\D/g, '');
    return digits ? `+380${digits}` : '';
  };

  // OTP functions — email
  const handleSendEmailOtp = async () => {
    setError('');
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type: 'register' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Помилка відправки коду');
        setOtpLoading(false);
        return;
      }
      setCountdown(60);
      setOtpStep('verify');
      setOtpCode(['', '', '', '', '', '']);
    } catch (err) {
      console.error('Send email OTP error:', err);
      setError('Помилка з\'єднання');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) { setError('Введіть 6-значний код'); return; }
    setError('');
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.remainingAttempts !== undefined ? `Невірний код. Залишилось спроб: ${data.remainingAttempts}` : (data.error || 'Невірний код'));
        setOtpLoading(false);
        return;
      }
      setEmailVerified(true);
      setOtpStep('input');
    } catch (err) {
      console.error('Verify email OTP error:', err);
      setError('Помилка з\'єднання');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    if (countdown > 0) return;
    await handleSendEmailOtp();
  };

  // OTP functions — phone
  const handleSendOtp = async () => {
    setError('');
    setOtpLoading(true);
    setTempCode('');

    try {
      const phoneNumber = getFullPhone(phone);
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, type: 'register' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Помилка відправки коду');
        setOtpLoading(false);
        return;
      }

      if (data.devCode) {
        setTempCode(data.devCode);
      }

      setCountdown(60);
      setOtpStep('verify');
      setOtpCode(['', '', '', '', '', '']);
    } catch (err) {
      console.error('Send OTP error:', err);
      setError('Помилка з\'єднання');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    await handleSendOtp();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);

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

  const handleVerifyOtp = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      setError('Введіть 6-значний код');
      return;
    }

    setError('');
    setOtpLoading(true);

    try {
      const phoneNumber = getFullPhone(phone);
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Невірний код');
        if (data.remainingAttempts !== undefined) {
          setError(`Невірний код. Залишилось спроб: ${data.remainingAttempts}`);
        }
        setOtpLoading(false);
        return;
      }

      setPhoneVerified(true);
      setOtpStep('input');
      setTempCode('');
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError('Помилка з\'єднання');
    } finally {
      setOtpLoading(false);
    }
  };

  // Validation
  const canProceed = () => {
    switch (step) {
      case 1:
        if (authMethod === 'email') {
          if (!email.trim()) return false;
          if (password.length < 6) return false;
          if (password !== confirmPassword) return false;
          if (!emailVerified) return false; // Must verify email first
          return true;
        } else {
          if (phone.replace(/\D/g, '').length !== 9) return false;
          if (password.length < 6) return false;
          if (password !== confirmPassword) return false;
          return true;
        }
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
          salonName: 'Новий салон',
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

  const softwareToSlug: Record<string, string> = {
    'Altegio / YCLIENTS': 'altegio',
    'Booksy': 'booksy',
    'Fresha': 'fresha',
    'Calendly': 'calendly',
    'Square': 'square',
    'Mindbody': 'mindbody',
    'Vagaro': 'vagaro',
    'Setmore': 'setmore',
    'Timely': 'timely',
    'Treatwell': 'treatwell',
    'Salon Iris': 'salonIris',
    'Інше': 'other',
    'none': 'none',
  };

  const saveStepProgress = async (currentStep: number, complete = false) => {
    try {
      const data: Record<string, unknown> = {};

      if (currentStep >= 2) {
        data.companyName = companyName || undefined;
        data.website = website || undefined;
      }
      if (currentStep >= 3) {
        data.categories = categories;
      }
      if (currentStep >= 4) {
        data.accountType = accountType;
      }
      if (currentStep >= 5) {
        data.serviceLocation = serviceLocation;
      }
      if (currentStep >= 6) {
        data.previousPlatform = currentSoftware ? softwareToSlug[currentSoftware] || 'other' : null;
      }

      await fetch('/api/salon/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: currentStep, data, complete }),
      });
    } catch (err) {
      console.error('Failed to save step progress:', err);
    }
  };

  const handleNext = async () => {
    setError('');

    if (step === 1) {
      const success = await handleRegister();
      if (!success) return;
    }

    if (step < totalSteps) {
      if (step >= 2) {
        await saveStepProgress(step);
      }
      setStep(step + 1);
    } else {
      await saveStepProgress(step, true);
      router.push('/dashboard?welcome=true');
    }
  };

  const handleBack = () => {
    if (otpStep === 'verify') {
      setOtpStep('input');
      setError('');
      setTempCode('');
      return;
    }
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Get Telegram deep link (GET генерує токен і повертає telegramLink)
  const handleGetTelegramLink = async () => {
    setTelegramLoading(true);
    try {
      const res = await fetch('/api/auth/link-telegram');
      const data = await res.json();
      
      if (data.telegramLink) {
        setTelegramLink(data.telegramLink);
      } else if (data.linked) {
        // Telegram вже прив'язаний
        setTelegramLink(null);
      }
    } catch (err) {
      console.error('Error getting telegram link:', err);
    } finally {
      setTelegramLoading(false);
    }
  };

  const hidePasswordIconsCSS = `
    input::-webkit-credentials-auto-fill-button,
    input::-webkit-contacts-auto-fill-button,
    input::-webkit-credit-card-auto-fill-button,
    input::-webkit-inner-spin-button,
    input::-webkit-outer-spin-button,
    input::-ms-reveal,
    input::-ms-clear {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
      position: absolute !important;
      right: -9999px !important;
    }
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50">
      <style>{hidePasswordIconsCSS}</style>
      {/* Header - тільки для кроків 2+ */}
      {step > 1 && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
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

          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>

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
              
              {/* OTP Verify Step */}
              {otpStep === 'verify' && authMethod === 'phone' ? (
                <>
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Назад
                  </button>

                  <div className="text-center">
                    <p className="text-gray-600">
                      Код відправлено на <span className="font-semibold">{getFullPhone(phone)}</span>
                    </p>
                  </div>

                  {tempCode && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm text-center">
                      <p className="font-medium">SMS сервіс в розробці</p>
                      <p className="mt-1">Ваш код: <span className="font-bold text-lg">{tempCode}</span></p>
                    </div>
                  )}

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

                  {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
                  )}

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpLoading || otpCode.join('').length !== 6}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25"
                  >
                    {otpLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Підтвердити
                        <Check className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* Auth Method Toggle */}
                  <div className="relative p-1 bg-gray-100 rounded-xl">
                    <div 
                      className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out"
                      style={{ left: authMethod === 'email' ? '4px' : 'calc(50% + 0px)' }}
                    />
                    <div className="relative grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setAuthMethod('email'); setError(''); }}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-base font-medium transition-colors duration-200 ${
                          authMethod === 'email' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAuthMethod('phone'); setError(''); }}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-base font-medium transition-colors duration-200 ${
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
                    <label className="block font-medium text-gray-700 mb-1.5" style={{ fontSize: '16px' }}>
                      {authMethod === 'email' ? 'Email' : 'Телефон'} *
                    </label>
                    
                    {authMethod === 'email' ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setEmailVerified(false); setOtpStep('input'); }}
                            placeholder="email@example.com"
                            autoComplete="off"
                            disabled={emailVerified}
                            style={{ fontSize: '16px', height: '50px' }}
                            className={`w-full px-4 pr-12 rounded-xl border outline-none text-gray-900 ${
                              emailVerified
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
                            }`}
                          />
                          {emailVerified && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              <Check className="w-5 h-5 text-green-500" />
                            </div>
                          )}
                        </div>

                        {/* Email OTP — send button */}
                        {!emailVerified && otpStep === 'input' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && (
                          <button
                            type="button"
                            onClick={handleSendEmailOtp}
                            disabled={otpLoading}
                            className="w-full py-3 rounded-xl bg-violet-100 text-violet-700 font-semibold text-sm hover:bg-violet-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                            Підтвердити email
                          </button>
                        )}

                        {/* Email OTP — verify */}
                        {!emailVerified && otpStep === 'verify' && (
                          <div className="space-y-3 p-4 bg-violet-50 rounded-xl border border-violet-100">
                            <p className="text-sm text-gray-600">
                              Код надіслано на <strong>{email}</strong>
                            </p>
                            <div className="flex gap-2 justify-center">
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
                                  onPaste={index === 0 ? handleOtpPaste : undefined}
                                  className="w-11 h-12 text-center text-lg font-bold rounded-lg border-2 border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
                                />
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleVerifyEmailOtp}
                                disabled={otpLoading || otpCode.join('').length !== 6}
                                className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Підтвердити
                              </button>
                              <button
                                type="button"
                                onClick={handleResendEmailOtp}
                                disabled={countdown > 0}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                              >
                                {countdown > 0 ? `${countdown}с` : 'Надіслати знову'}
                              </button>
                            </div>
                          </div>
                        )}

                        {emailVerified && (
                          <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Email підтверджено
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
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
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            placeholder="XX XXX XX XX"
                            maxLength={12}
                            autoComplete="off"
                            style={{ fontSize: '16px', height: '50px' }}
                            className={`w-full pl-16 pr-4 rounded-xl border outline-none text-gray-900 ${
                              phoneVerified 
                                ? 'border-green-300 bg-green-50' 
                                : 'border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
                            }`}
                          />
                          {phoneVerified && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              <Check className="w-5 h-5 text-green-500" />
                            </div>
                          )}
                        </div>
                        
                        {!phoneVerified && phone.replace(/\D/g, '').length === 9 && (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={otpLoading}
                            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50 text-sm"
                          >
                            {otpLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : (
                              'Підтвердити номер (необов\'язково)'
                            )}
                          </button>
                        )}
                        
                        {phoneVerified && (
                          <p className="text-green-600 text-sm flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Номер підтверджено
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-1.5" style={{ fontSize: '16px' }}>Пароль *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Мінімум 6 символів"
                        autoComplete="new-password"
                        style={{ fontSize: '16px', height: '50px' }}
                        className="w-full px-4 pr-12 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>

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
                        <span className={`text-xs font-medium ${
                          passwordStrength.score <= 1 ? 'text-red-500' :
                          passwordStrength.score === 2 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-1.5" style={{ fontSize: '16px' }}>Підтвердіть пароль *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Повторіть пароль"
                        autoComplete="new-password"
                        style={{ fontSize: '16px', height: '50px' }}
                        className={`w-full px-4 pr-20 rounded-xl border outline-none text-gray-900 ${
                          confirmPassword && password !== confirmPassword
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                            : confirmPassword && password === confirmPassword
                            ? 'border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'
                            : 'border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {confirmPassword && (
                          password === confirmPassword ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <span className="text-red-500 text-lg">✕</span>
                          )
                        )}
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
                  )}

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
                </>
              )}
            </div>

            <p className="text-center text-gray-500 text-sm">
              Вже маєте акаунт?{' '}
              <Link href="/login" className="text-violet-600 font-medium hover:underline">Увійти</Link>
            </p>
          </div>
        )}

        {/* ===== STEP 2: Company Name + Website ===== */}
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
            
            {/* Telegram Link Button */}
            <div className="w-full max-w-sm space-y-4 mb-8">
              {!telegramLink ? (
                <button
                  onClick={handleGetTelegramLink}
                  disabled={telegramLoading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#0088cc] text-white rounded-full font-medium hover:bg-[#0077b5] transition-colors shadow-lg shadow-[#0088cc]/25"
                >
                  {telegramLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5" />
                      Підключити Telegram
                    </>
                  )}
                </button>
              ) : (
                <a
                  href={telegramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#0088cc] text-white rounded-full font-medium hover:bg-[#0077b5] transition-colors shadow-lg shadow-[#0088cc]/25"
                >
                  <MessageCircle className="w-5 h-5" />
                  Відкрити Telegram
                </a>
              )}
              
              <p className="text-gray-400 text-sm">
                Підключіть Telegram для швидкого входу та сповіщень
              </p>
            </div>
            
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
