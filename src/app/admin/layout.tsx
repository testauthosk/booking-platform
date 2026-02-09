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
  CreditCard,
  UserCog,
  Key,
  Terminal,
  Send,
  Mail,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  exact?: boolean;
  divider?: boolean;
  group?: boolean;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  // Головна
  { group: true, label: 'Головна' },
  { href: '/admin', icon: BarChart3, label: 'Дашборд', exact: true },
  
  // Дані
  { group: true, label: 'Дані' },
  { href: '/admin/salons', icon: Store, label: 'Салони' },
  { href: '/admin/users', icon: Users, label: 'Користувачі' },
  { href: '/admin/clients', icon: Users, label: 'Клієнти' },
  { href: '/admin/bookings', icon: Calendar, label: 'Бронювання' },
  { href: '/admin/inventory', icon: Package, label: 'Склад' },
  
  // Фінанси
  { group: true, label: 'Фінанси' },
  { href: '/admin/subscriptions', icon: CreditCard, label: 'Підписки' },
  
  // Комунікації
  { group: true, label: 'Комунікації' },
  { href: '/admin/reminders', icon: Bell, label: 'Нагадування' },
  { href: '/admin/emails', icon: Mail, label: 'Email логи' },
  { href: '/admin/telegram-logs', icon: MessageCircle, label: 'Telegram логи' },
  { href: '/admin/broadcast', icon: Send, label: 'Broadcast' },
  
  // Інструменти
  { group: true, label: 'Інструменти' },
  { href: '/admin/impersonate', icon: UserCog, label: 'Impersonate' },
  { href: '/admin/otp', icon: Key, label: 'OTP Debug' },
  { href: '/admin/sql', icon: Terminal, label: 'SQL Console' },
  
  // Система
  { group: true, label: 'Система' },
  { href: '/admin/logs', icon: FileText, label: 'Логи' },
  { href: '/admin/system', icon: Activity, label: 'Система' },
  { href: '/admin/backups', icon: Database, label: 'Бекапи' },
  { href: '/admin/settings', icon: Settings, label: 'Налаштування' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, signOut, isSuperAdmin } = useAuth();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  const isLoginPage = pathname === '/admin/login';

  // Redirect if not super admin
  useEffect(() => {
    if (isLoginPage) return;
    
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

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  // Group nav items
  const groupedItems: { group: string; items: NavItem[] }[] = [];
  let currentGroup = '';
  
  for (const item of navItems) {
    if (item.group) {
      currentGroup = item.label;
      groupedItems.push({ group: currentGroup, items: [] });
    } else if (currentGroup && groupedItems.length > 0) {
      groupedItems[groupedItems.length - 1].items.push(item);
    }
  }

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
          {groupedItems.map(({ group, items }) => (
            <div key={group} className="mb-2">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400"
              >
                <span>{group}</span>
                {collapsedGroups.has(group) ? (
                  <ChevronRight className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              
              {/* Group items */}
              {!collapsedGroups.has(group) && (
                <div className="mt-1 space-y-0.5">
                  {items.map((item) => {
                    if (!item.href || !item.icon) return null;
                    const active = isActive(item.href, item.exact);
                    const Icon = item.icon;
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          active
                            ? 'bg-violet-500/20 text-violet-400'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Icon className="w-[18px] h-[18px]" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
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
