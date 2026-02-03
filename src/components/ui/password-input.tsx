'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';

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
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setShowPassword(!showPassword);
      setTimeout(() => setIsAnimating(false), 150);
    }, 100);
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
        onClick={handleToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-90"
        aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
      >
        <div 
          className={`transition-all duration-200 ${
            isAnimating 
              ? 'scale-0 rotate-180 opacity-0' 
              : 'scale-100 rotate-0 opacity-100'
          }`}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </div>
      </button>
    </div>
  );
}
