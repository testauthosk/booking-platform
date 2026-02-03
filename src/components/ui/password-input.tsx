'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import dynamic from 'next/dynamic';
import type { LottieRefCurrentProps } from 'lottie-react';

// Correct dynamic import syntax for lottie-react
const Lottie = dynamic(
  () => import('lottie-react').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => <div className="w-6 h-6 bg-muted rounded-full animate-pulse" />
  }
);

// Animation data
import eyeAnimationData from '@/assets/eye-password.json';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = 'Пароль',
  className,
  id,
  name,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  // Ensure client-side rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  const togglePassword = () => {
    setShowPassword(!showPassword);
    
    // Control animation direction
    if (lottieRef.current) {
      if (!showPassword) {
        lottieRef.current.setDirection(1);
        lottieRef.current.play();
      } else {
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
        {mounted ? (
          <Lottie
            lottieRef={lottieRef}
            animationData={eyeAnimationData}
            loop={false}
            autoplay={false}
            style={{ width: 24, height: 24, display: 'block' }}
          />
        ) : (
          <div className="w-6 h-6 bg-muted rounded-full animate-pulse" />
        )}
      </button>
    </div>
  );
}
