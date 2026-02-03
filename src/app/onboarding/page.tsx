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
  Globe
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
      // Завершення — йдемо на dashboard
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
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-sm">
        {/* Progress Bar */}
        <div className="flex gap-1.5 px-6 pt-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i < step ? 'bg-violet-500' : 'bg-gray-800'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-10" />
          )}

          {step < totalSteps && (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 rounded-full font-medium hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Продовжити
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="pt-28 pb-12 px-6 max-w-3xl mx-auto">
        
        {/* Step 1: Company Name */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <p className="text-gray-400 text-sm mb-2">Налаштування акаунту</p>
              <h1 className="text-3xl md:text-4xl font-bold">
                Як називається ваша компанія?
              </h1>
              <p className="text-gray-400 mt-3">
                Цю назву бачитимуть ваші клієнти. Юридичну назву можна вказати пізніше.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Назва компанії
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Beauty Studio"
                  autoFocus
                  className="w-full px-4 py-3.5 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Сайт <span className="text-gray-500">(необов'язково)</span>
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="www.yoursite.com"
                  className="w-full px-4 py-3.5 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Categories */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <p className="text-gray-400 text-sm mb-2">Налаштування акаунту</p>
              <h1 className="text-3xl md:text-4xl font-bold">
                Оберіть категорії, які найкраще описують ваш бізнес
              </h1>
              <p className="text-gray-400 mt-3">
                Оберіть основний вид послуг і до 3 додаткових
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
                    className={`relative flex flex-col items-start gap-3 p-4 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-gray-700 hover:border-gray-600 bg-gray-900'
                    } ${!isSelected && categories.length >= 3 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-violet-400' : 'text-gray-400'}`} />
                    <span className="font-medium">{cat.name}</span>
                    
                    {isFirst && (
                      <span className="absolute top-2 right-2 text-xs bg-violet-500 text-white px-2 py-0.5 rounded-full">
                        Основний
                      </span>
                    )}
                    
                    {isSelected && !isFirst && (
                      <Check className="absolute top-3 right-3 w-4 h-4 text-violet-400" />
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
            <div>
              <p className="text-gray-400 text-sm mb-2">Налаштування акаунту</p>
              <h1 className="text-3xl md:text-4xl font-bold">
                Оберіть тип акаунту
              </h1>
              <p className="text-gray-400 mt-3">
                Це допоможе правильно налаштувати ваш акаунт
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setAccountType('solo')}
                className={`flex flex-col items-start gap-4 p-6 rounded-xl border transition-all text-left ${
                  accountType === 'solo'
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-gray-700 hover:border-gray-600 bg-gray-900'
                }`}
              >
                <User className={`w-8 h-8 ${accountType === 'solo' ? 'text-violet-400' : 'text-gray-400'}`} />
                <span className="font-medium text-lg">Я працюю на себе</span>
              </button>

              <button
                onClick={() => setAccountType('team')}
                className={`flex flex-col items-start gap-4 p-6 rounded-xl border transition-all text-left ${
                  accountType === 'team'
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-gray-700 hover:border-gray-600 bg-gray-900'
                }`}
              >
                <Users className={`w-8 h-8 ${accountType === 'team' ? 'text-violet-400' : 'text-gray-400'}`} />
                <span className="font-medium text-lg">У мене є команда</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Service Location */}
        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <p className="text-gray-400 text-sm mb-2">Налаштування акаунту</p>
              <h1 className="text-3xl md:text-4xl font-bold">
                Де ви надаєте послуги?
              </h1>
            </div>

            <div className="space-y-3">
              {[
                { id: 'physical', label: 'Клієнти приходять до мене', icon: Building2 },
                { id: 'mobile', label: 'Я працюю з виїздом до клієнта', icon: Car },
                { id: 'online', label: 'Я надаю послуги онлайн', icon: Monitor },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => setServiceLocation(option.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                      serviceLocation === option.id
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-gray-700 hover:border-gray-600 bg-gray-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${serviceLocation === option.id ? 'text-violet-400' : 'text-gray-400'}`} />
                    <span className="font-medium">{option.label}</span>
                    {serviceLocation === option.id && (
                      <Check className="w-5 h-5 text-violet-400 ml-auto" />
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
            <div>
              <p className="text-gray-400 text-sm mb-2">Налаштування акаунту</p>
              <h1 className="text-3xl md:text-4xl font-bold">
                Яке програмне забезпечення ви використовуєте?
              </h1>
              <p className="text-gray-400 mt-3">
                Хочете змінити платформу? Ми допоможемо імпортувати дані.
              </p>
            </div>

            <div className="space-y-2">
              {SOFTWARE_OPTIONS.map((software) => (
                <button
                  key={software}
                  onClick={() => setCurrentSoftware(software)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                    currentSoftware === software
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-gray-700 hover:border-gray-600 bg-gray-900'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    currentSoftware === software
                      ? 'border-violet-500 bg-violet-500'
                      : 'border-gray-500'
                  }`}>
                    {currentSoftware === software && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span>{software}</span>
                </button>
              ))}

              <button
                onClick={() => setCurrentSoftware('none')}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                  currentSoftware === 'none'
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-gray-700 hover:border-gray-600 bg-gray-900'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  currentSoftware === 'none'
                    ? 'border-violet-500 bg-violet-500'
                    : 'border-gray-500'
                }`}>
                  {currentSoftware === 'none' && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <span>Я не використовую ПЗ</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Done */}
        {step === 6 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-8 shadow-lg shadow-violet-500/30">
              <Check className="w-12 h-12 text-white" />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Ваш акаунт налаштовано!
            </h1>
            
            <p className="text-gray-400 mb-8">
              Ласкаво просимо! Почніть керувати своїм бізнесом.
            </p>
            
            <button
              onClick={handleNext}
              className="px-8 py-3.5 bg-white text-gray-900 rounded-full font-medium hover:bg-gray-100 transition-colors"
            >
              Готово
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
