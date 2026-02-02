'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, Calendar, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEMO_SALON_ID = 'demo-salon-id';
const POLL_INTERVAL = 30000;

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  entityType?: string;
  createdAt: string;
}

const typeIcons: Record<string, typeof Bell> = {
  new_booking: Calendar,
  booking_cancelled: Calendar,
  new_client: User,
  reminder: Bell,
};

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60 * 1000) return 'Щойно';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} хв`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} год`;
  return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?salonId=${DEMO_SALON_ID}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Load notifications error:', error);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const interval = setInterval(loadNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    
    setLoading(true);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId: DEMO_SALON_ID, markAllRead: true }),
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Mark read error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = () => {
    setOpen(prev => !prev);
  };

  return (
    <div ref={containerRef} className="relative z-50">
      {/* Bell button container - merges with panel when open */}
      <div
        className={cn(
          "relative transition-all duration-300 ease-out",
          open && "z-[60]"
        )}
      >
        {/* Bell circle button */}
        <button
          onClick={toggleOpen}
          type="button"
          className={cn(
            "relative h-10 w-10 flex items-center justify-center transition-all duration-300 ease-out cursor-pointer",
            "hover:bg-muted",
            open 
              ? "bg-card rounded-t-xl rounded-b-none shadow-lg border border-border border-b-0" 
              : "rounded-full"
          )}
        >
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute h-4 w-4 bg-destructive rounded-full text-[10px] text-white font-medium flex items-center justify-center transition-all duration-300",
              open ? "top-1 right-1" : "top-0 right-0"
            )}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification panel - flows from button */}
      <div
        className={cn(
          "absolute right-0 top-10 w-80 origin-top transition-all duration-300 ease-out z-50",
          "bg-card border border-border border-t-0 rounded-b-xl rounded-tl-xl shadow-lg overflow-hidden",
          open 
            ? "opacity-100 scale-y-100 translate-y-0" 
            : "opacity-0 scale-y-0 -translate-y-2 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-foreground">Сповіщення</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={loading}
              className="text-xs h-7 px-2 rounded-md hover:bg-muted transition-colors flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Check className="h-3 w-3" />
                  Прочитати всі
                </>
              )}
            </button>
          )}
        </div>

        {/* Notifications list */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Немає сповіщень</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = typeIcons[notification.type] || Bell;
              
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 border-b border-border last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors",
                    !notification.isRead && "bg-primary/5"
                  )}
                >
                  <div className="flex gap-3">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      !notification.isRead 
                        ? "bg-primary/10 text-primary" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm text-foreground",
                        !notification.isRead && "font-medium"
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
