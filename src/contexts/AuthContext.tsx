"use client";

import { SessionProvider, useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { createContext, useContext, ReactNode } from 'react';

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  salonId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthContextProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  const user: AuthUser | null = session?.user ? {
    id: session.user.id,
    email: session.user.email || '',
    name: session.user.name || null,
    role: session.user.role || 'SALON_OWNER',
    salonId: session.user.salonId || null,
  } : null;

  const signIn = async (email: string, password: string) => {
    try {
      const result = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        return { error: 'Невірний email або пароль' };
      }

      return { error: null };
    } catch (err) {
      console.error('Sign in error:', err);
      return { error: 'Помилка підключення до сервера' };
    }
  };

  const signOut = async () => {
    try {
      await nextAuthSignOut({ redirect: false });
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        isSuperAdmin: user?.role === 'SUPER_ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextProvider>
        {children}
      </AuthContextProvider>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
