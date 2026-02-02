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
  const [isAnimating, setIsAnimating] = useState(false);
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
        handleClose();
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
    setIsAnimating(true);
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => setOpen(false), 200);
  };

  const toggleOpen = () => {
    if (open) {
      handleClose();
    } else {
      handleOpen();
    }
  };

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

  return (
    <div ref={containerRef} className="relative">
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-8px) scale(0.95);
          }
        }
        .notification-panel-open {
          animation: slideDown 0.2s ease-out forwards;
        }
        .notification-panel-close {
          animation: slideUp 0.2s ease-out forwards;
        }
      `}</style>

      {/* Bell button */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleOpen}
        onKeyDown={(e) => e.key === 'Enter' && toggleOpen()}
        className="relative h-10 w-10 flex items-center justify-center cursor-pointer select-none rounded-full hover:bg-muted active:scale-95 transition-transform duration-150"
      >
        <Bell className="h-5 w-5 text-foreground pointer-events-none" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-destructive rounded-full text-[10px] text-white font-medium flex items-center justify-center pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {/* Notification panel */}
      {open && (
        <div 
          className={cn(
            "absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50",
            isAnimating ? "notification-panel-open" : "notification-panel-close"
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
      )}
    </div>
  );
}
