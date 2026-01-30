"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  Users,
  UserCircle,
  BarChart3,
  Settings,
  Image,
  Clock,
  Star,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Store,
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  salonName: string;
  salonType: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
}

const menuItems = [
  { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { id: 'bookings', label: 'Записи', icon: Calendar },
  { id: 'services', label: 'Услуги', icon: Scissors },
  { id: 'team', label: 'Команда', icon: Users },
  { id: 'clients', label: 'Клиенты', icon: UserCircle },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
];

const settingsItems = [
  { id: 'profile', label: 'Профиль салона', icon: Store },
  { id: 'photos', label: 'Фото и медиа', icon: Image },
  { id: 'schedule', label: 'Расписание', icon: Clock },
  { id: 'reviews', label: 'Отзывы', icon: Star },
  { id: 'notifications', label: 'Уведомления', icon: Bell },
  { id: 'settings', label: 'Настройки', icon: Settings },
];

export function Sidebar({ salonName, salonType, activeTab, onTabChange, onSignOut }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? 'w-[72px]' : 'w-64'} bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 transition-all duration-300`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">
              {salonName.charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h2 className="font-semibold text-gray-900 truncate">{salonName}</h2>
              <p className="text-xs text-gray-500 truncate">{salonType}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* Main Menu */}
        <div className="px-3 mb-6">
          {!collapsed && (
            <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Меню
            </p>
          )}
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${activeTab === item.id ? 'text-violet-600' : 'text-gray-400'}`} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Settings */}
        <div className="px-3">
          {!collapsed && (
            <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Настройки
            </p>
          )}
          <ul className="space-y-1">
            {settingsItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${activeTab === item.id ? 'text-violet-600' : 'text-gray-400'}`} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors mb-2"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span className="text-sm">Свернуть</span>}
        </button>

        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title={collapsed ? 'Выйти' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Выйти</span>}
        </button>
      </div>
    </aside>
  );
}
