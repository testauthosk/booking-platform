'use client';

import { useState, useRef } from 'react';
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

// Eye animation - local file
import eyeAnimationData from '@/assets/eye-password.json';

export function PasswordInput({
  value,
  onChange,
  placeholder = 'Пароль',
  className,
  id,
  name,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

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
        <Lottie
          lottieRef={lottieRef}
          animationData={eyeAnimationData}
          loop={false}
          autoplay={false}
          style={{ width: 24, height: 24 }}
        />
      </button>
    </div>
  );
}
