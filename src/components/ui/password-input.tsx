'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
}

// Eye animation data URL (show/hide password)
const EYE_ANIMATION_URL = 'https://lottie.host/d7834be5-cd19-4a71-a269-8ad7ad448553/bFykrSJKFR.json';

export function PasswordInput({
  value,
  onChange,
  placeholder = 'Пароль',
  className,
  id,
  name,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [animationData, setAnimationData] = useState<object | null>(null);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  // Load animation data
  useEffect(() => {
    fetch(EYE_ANIMATION_URL)
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(() => {
        // Fallback - no animation
        console.log('Could not load eye animation');
      });
  }, []);

  const togglePassword = () => {
    setShowPassword(!showPassword);
    
    // Control animation direction
    if (lottieRef.current) {
      if (!showPassword) {
        // Show password - play forward (eye closes)
        lottieRef.current.setDirection(1);
        lottieRef.current.play();
      } else {
        // Hide password - play reverse (eye opens)
        lottieRef.current.setDirection(-1);
        lottieRef.current.play();
      }
    }
  };

  return (
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`pr-12 ${className || ''}`}
        id={id}
        name={name}
      />
      <button
        type="button"
        onClick={togglePassword}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center hover:bg-muted rounded-md transition-colors"
        aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
      >
        {animationData ? (
          <Lottie
            lottieRef={lottieRef}
            animationData={animationData}
            loop={false}
            autoplay={false}
            style={{ width: 24, height: 24 }}
          />
        ) : (
          // Fallback icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            {showPassword ? (
              <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            ) : (
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        )}
      </button>
    </div>
  );
}
