"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  ArrowLeft,
  Check,
  Scissors,
  Sparkles,
  Eye,
  Heart,
  Flower2,
  Dumbbell,
  Sun,
  Palette,
  Stethoscope,
  PawPrint,
  Grid3X3,
  User,
  Users,
  Building2,
  Car,
  Monitor,
} from 'lucide-react';

// Категорії бізнесу
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

// Поточне ПЗ
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

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  // Form data (поки без збереження)
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [accountType, setAccountType] = useState<'solo' | 'team' | null>(null);
  const [serviceLocation, setServiceLocation] = useState<string | null>(null);
  const [currentSoftware, setCurrentSoftware] = useState<string | null>(null);

  const canProceed = () => {
    switch (step) {
      case 1: return companyName.trim().length > 0;
      case 2: return categories.length > 0;
      case 3: return accountType !== null;
      case 4: return serviceLocation !== null;
      case 5: return currentSoftware !== null;
      default: return true;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      router.push('/dashboard?welcome=true');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const toggleCategory = (id: string) => {
    if (categories.includes(id)) {
      setCategories(categories.filter(c => c !== id));
    } else if (categories.length < 3) {
      setCategories([...categories, id]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        {/* Progress Bar */}
        <div className="flex gap-1.5 px-6 pt-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < step ? 'bg-violet-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          ) : (
            <div className="w-10" />
          )}

          <span className="text-sm text-gray-400">
            Крок {step} з {totalSteps}
          </span>

          {step < totalSteps && (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-full font-medium hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25"
            >
              Далі
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          
          {step === totalSteps && <div className="w-20" />}
        </div>
      </header>

      {/* Content */}
      <main className="pt-32 pb-12 px-6 max-w-2xl mx-auto">
        
        {/* Step 1: Company Name */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <p className="text-violet-600 text-sm font-medium mb-2">Налаштування акаунту</p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Як називається ваша компанія?
              </h1>
              <p className="text-gray-500 mt-3 max-w-md mx-auto">
                Цю назву бачитимуть ваші клієнти
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Назва компанії *
                </label>
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

        {/* Step 2: Categories */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <p className="text-violet-600 text-sm font-medium mb-2">Налаштування акаунту</p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Оберіть тип вашого бізнесу
              </h1>
              <p className="text-gray-500 mt-3">
                Оберіть до 3 категорій
              </p>
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

        {/* Step 3: Account Type */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <p className="text-violet-600 text-sm font-medium mb-2">Налаштування акаунту</p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Як ви працюєте?
              </h1>
              <p className="text-gray-500 mt-3">
                Це допоможе налаштувати ваш акаунт
              </p>
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

        {/* Step 4: Service Location */}
        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <p className="text-violet-600 text-sm font-medium mb-2">Налаштування акаунту</p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Де ви надаєте послуги?
              </h1>
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

        {/* Step 5: Current Software */}
        {step === 5 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <p className="text-violet-600 text-sm font-medium mb-2">Налаштування акаунту</p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Чим ви користуєтесь зараз?
              </h1>
              <p className="text-gray-500 mt-3">
                Ми допоможемо перенести ваші дані
              </p>
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

        {/* Step 6: Done */}
        {step === 6 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-8 shadow-2xl shadow-violet-500/30">
              <Check className="w-12 h-12 text-white" />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Все готово! 🎉
            </h1>
            
            <p className="text-gray-500 mb-8 max-w-sm">
              Ваш акаунт налаштовано. Час почати працювати!
            </p>
            
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
