'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';

function getDeviceFingerprint(): string {
  return [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|');
}

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP state
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [otpChannel, setOtpChannel] = useState('');
  const [otpTarget, setOtpTarget] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Auto-focus OTP input
  useEffect(() => {
    if (otpStep && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [otpStep]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          deviceFingerprint: getDeviceFingerprint(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Невірний email або пароль');
        return;
      }

      // OTP required for new device
      if (data.requireOtp) {
        setPendingToken(data.pendingToken);
        setOtpChannel(data.otpChannel);
        setOtpTarget(data.otpTarget);
        setDeviceLabel(data.deviceLabel || '');
        setOtpStep(true);
        setResendTimer(60);
        if (!data.otpSent) {
          setError('Не вдалося відправити код. Перевірте налаштування пошти.');
        }
        return;
      }

      // Trusted device — direct login
      completeLogin(data);
    } catch {
      setError('Щось пішло не так');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/staff/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken, code: otpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Невірний код');
        return;
      }

      completeLogin(data);
    } catch {
      setError('Щось пішло не так');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          deviceFingerprint: getDeviceFingerprint(),
        }),
      });

      const data = await res.json();
      if (data.requireOtp) {
        setPendingToken(data.pendingToken);
        setResendTimer(60);
        setOtpCode('');
      }
    } catch {
      setError('Не вдалося відправити код');
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = (data: {
    token: string;
    master: { id: string; name: string; salonId: string; avatar?: string };
  }) => {
    localStorage.setItem('staffToken', data.token);
    localStorage.setItem('staffId', data.master.id);
    localStorage.setItem('staffName', data.master.name);
    localStorage.setItem('staffSalonId', data.master.salonId);
    if (data.master.avatar) {
      localStorage.setItem('staffAvatar', data.master.avatar);
    }
    router.push('/staff');
  };

  const handleBack = () => {
    setOtpStep(false);
    setOtpCode('');
    setPendingToken('');
    setError(null);
  };

  // ── OTP Step ──
  if (otpStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Підтвердження входу</CardTitle>
            <CardDescription>
              Новий пристрій: <span className="font-medium">{deviceLabel}</span>
              <br />
              Код відправлено на{' '}
              <span className="font-medium">
                {otpChannel === 'telegram' ? 'Telegram' : otpTarget}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Код підтвердження</Label>
                <Input
                  ref={otpInputRef}
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  autoComplete="one-time-code"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || otpCode.length < 6}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Підтвердити
              </Button>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Назад
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={resendTimer > 0 || loading}
                  onClick={handleResendOtp}
                >
                  {resendTimer > 0
                    ? `Відправити знову (${resendTimer}с)`
                    : 'Відправити знову'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Login Step ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Вхід для майстрів</CardTitle>
          <CardDescription>
            Увійдіть до свого особистого кабінету
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <PasswordInput
                id="password"
                name="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Увійти
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
