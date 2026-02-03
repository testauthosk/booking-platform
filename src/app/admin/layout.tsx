'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  Loader2,
  LogOut,
  Store,
  Users,
  Calendar,
  Settings,
  BarChart3,
  Bell,
  FileText,
  Database,
  Activity,
  MessageCircle,
  Package,
  Shield,
  ChevronDown,
} from 'lucide-react';

const navItems = [
  { href: '/admin', icon: BarChart3, label: 'Дашборд', exact: true },
  { href: '/admin/salons', icon: Store, label: 'Салони' },
  { href: '/admin/users', icon: Users, label: 'Користувачі' },
  { href: '/admin/clients', icon: Users, label: 'Клієнти' },
  { href: '/admin/bookings', icon: Calendar, label: 'Бронювання' },
  { href: '/admin/inventory', icon: Package, label: 'Склад' },
  { href: '/admin/reminders', icon: MessageCircle, label: 'Напоминання' },
  { divider: true },
  { href: '/admin/logs', icon: FileText, label: 'Логи' },
  { href: '/admin/system', icon: Activity, label: 'Система' },
  { href: '/admin/backups', icon: Database, label: 'Бекапи' },
  { href: '/admin/settings', icon: Settings, label: 'Налаштування' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, signOut, isSuperAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const isLoginPage = pathname === '/admin/login';

  // Redirect if not super admin (must be before any conditional returns)
  useEffect(() => {
    if (isLoginPage) return; // Don't redirect on login page
    
    if (!authLoading && !user) {
      router.push('/admin/login');
    } else if (!authLoading && user && !isSuperAdmin) {
      router.push('/dashboard');
    }
  }, [authLoading, user, isSuperAdmin, router, isLoginPage]);

  // Skip layout for login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#12121a] border-r border-white/5 flex flex-col h-screen fixed">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white">SuperAdmin</span>
              <p className="text-[10px] text-violet-400">God Mode</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item, i) => {
            if ('divider' in item) {
              return <div key={i} className="h-px bg-white/5 my-3" />;
            }
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.email}</p>
              <p className="text-xs text-gray-500">Super Admin</p>
            </div>
            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 min-h-screen">
        {children}
      </main>
    </div>
  );
}
