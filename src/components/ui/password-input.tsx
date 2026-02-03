'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';

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

  return (
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`pr-12 ${className || ''} [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden`}
        id={id}
        name={name}
        style={{ 
          // Hide Safari's built-in password toggle
          WebkitTextSecurity: showPassword ? 'none' : undefined 
        }}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-800 transition-colors"
        aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
      >
        {/* SVG Eye with animated slash */}
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          {/* Eye shape */}
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          {/* Pupil */}
          <circle cx="12" cy="12" r="3" />
          {/* Animated slash line */}
          <line 
            x1="1" 
            y1="1" 
            x2="23" 
            y2="23"
            className={`transition-all duration-200 origin-center ${
              showPassword 
                ? 'opacity-0 scale-0' 
                : 'opacity-100 scale-100'
            }`}
            style={{
              transformOrigin: 'center',
              transition: 'opacity 0.2s ease, transform 0.2s ease'
            }}
          />
        </svg>
      </button>
    </div>
  );
}
