'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [invitation, setInvitation] = useState<{
    valid: boolean;
    email?: string;
    name?: string;
    role?: string;
    error?: string;
  } | null>(null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Проверяем токен
  useEffect(() => {
    const checkToken = async () => {
      try {
        const res = await fetch(`/api/invitations/accept?token=${token}`);
        const data = await res.json();
        setInvitation(data);
        if (data.name) setName(data.name);
      } catch (err) {
        setInvitation({ valid: false, error: 'Failed to check invitation' });
      } finally {
        setLoading(false);
      }
    };
    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Паролі не співпадають');
      return;
    }

    if (password.length < 6) {
      setError('Пароль має бути не менше 6 символів');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      setSuccess(true);
      
      // Редирект на логін через 2 секунди
      setTimeout(() => {
        router.push('/staff/login');
      }, 2000);
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invitation?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Запрошення недійсне</CardTitle>
            <CardDescription>
              {invitation?.error === 'Invitation expired'
                ? 'Термін дії запрошення закінчився'
                : invitation?.error === 'Invitation already used'
                ? 'Це запрошення вже було використано'
                : 'Запрошення не знайдено або недійсне'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Акаунт створено!</CardTitle>
            <CardDescription>
              Зараз вас буде перенаправлено на сторінку входу...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Приєднатися до команди</CardTitle>
          <CardDescription>
            Створіть свій акаунт майстра
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={invitation.email || ''} disabled />
            </div>

            {invitation.role && (
              <div className="space-y-2">
                <Label>Посада</Label>
                <Input value={invitation.role} disabled />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Ім'я *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше ім'я"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Мінімум 6 символів"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Підтвердіть пароль *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторіть пароль"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Створити акаунт
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
