'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import dynamic from 'next/dynamic';

// Use @lottiefiles/react-lottie-player - more reliable with Next.js
const Player = dynamic(
  () => import('@lottiefiles/react-lottie-player').then((mod) => mod.Player),
  { ssr: false }
);

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

  useEffect(() => {
    setMounted(true);
  }, []);

  const togglePassword = () => {
    setShowPassword(!showPassword);
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
          <div style={{ filter: 'invert(0.4)' }}>
            <Player
              key={showPassword ? 'visible' : 'hidden'}
              src="/animations/eye-password.json"
              background="transparent"
              speed={1.5}
              loop={false}
              autoplay={true}
              style={{ width: 28, height: 28, display: 'block' }}
            />
          </div>
        ) : (
          <div className="w-6 h-6 bg-muted rounded-full animate-pulse" />
        )}
      </button>
    </div>
  );
}
