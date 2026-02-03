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
        className={`pr-12 ${className || ''}`}
        id={id}
        name={name}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded transition-colors"
        aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
      >
        {/* CSS-only animated eye */}
        <div className={`eye ${!showPassword ? 'slash' : ''}`}>
          <div></div>
          <div></div>
        </div>
      </button>
      
      <style jsx>{`
        .eye {
          width: 1.25em;
          height: 0.75em;
          position: relative;
          display: inline-block;
          --background: hsl(var(--background));
          --color: hsl(var(--muted-foreground));
          cursor: pointer;
        }
        .eye:hover {
          --color: hsl(var(--foreground));
        }
        .eye div {
          overflow: hidden;
          height: 50%;
          position: relative;
          margin-bottom: -1px;
        }
        .eye div:before {
          content: '';
          background: var(--color);
          position: absolute;
          left: 0;
          right: 0;
          height: 300%;
          border-radius: 100%;
          transition: background 0.2s;
        }
        .eye div:last-child:before {
          bottom: 0;
        }
        /* Pupil */
        .eye:before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 0.35em;
          height: 0.35em;
          background: var(--color);
          border: 0.1em solid var(--background);
          border-radius: 100%;
          z-index: 1;
          transition: background 0.2s;
        }
        /* Slash line */
        .eye:after {
          content: '';
          position: absolute;
          top: -0.15em;
          left: calc(33.333% - 0.15em);
          transform: rotate(45deg) scaleX(0);
          transform-origin: left center;
          width: 90%;
          height: 0.12em;
          background: var(--color);
          border-top: 0.1em solid var(--background);
          z-index: 2;
          transition: transform 0.2s ease-out, background 0.2s;
        }
        .eye.slash:after {
          transform: rotate(45deg) scaleX(1);
        }
      `}</style>
    </div>
  );
}
