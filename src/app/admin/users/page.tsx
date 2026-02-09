'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Users,
  Search,
  Plus,
  UserCog,
  Scissors,
  Mail,
  Phone,
  Store,
  MoreVertical,
  Edit2,
  Trash2,
  Key,
  Shield,
  Star,
  Calendar,
  MessageCircle,
  LogIn,
  Ban,
  CheckCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface User {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: string;
  salonId: string | null;
  createdAt: string;
  userType: 'admin' | 'master';
  isActive?: boolean;
  rating?: number;
  reviewCount?: number;
  lastLogin?: string | null;
  telegramChatId?: string | null;
  notificationsEnabled?: boolean;
  salon?: { id: string; name: string; slug: string } | null;
  _count?: { bookings: number };
}

interface Salon {
  id: string;
  name: string;
  slug: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'master'>('all');
  const [salonFilter, setSalonFilter] = useState<string>('');
  const [stats, setStats] = useState({ total: 0, admins: 0, masters: 0 });
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    userType: 'admin' as 'admin' | 'master',
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'SALON_OWNER',
    salonId: '',
  });

  // Reset password modal
  const [resetPasswordModal, setResetPasswordModal] = useState<User | null>(null);
  const [resetPasswordSendVia, setResetPasswordSendVia] = useState<'email' | 'telegram' | 'both' | 'none'>('email');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchSalons();
  }, [filter, salonFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('type', filter);
      if (salonFilter) params.set('salonId', salonFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setStats({
          total: data.totalAdmins + data.totalMasters,
          admins: data.totalAdmins,
          masters: data.totalMasters,
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalons = async () => {
    try {
      const res = await fetch('/api/admin/salons');
      if (res.ok) {
        const data = await res.json();
        setSalons(data);
      }
    } catch (error) {
      console.error('Error fetching salons:', error);
    }
  };

  const handleSearch = () => {
    fetchUsers();
  };

  const openNewModal = (type: 'admin' | 'master') => {
    setEditingUser(null);
    setFormData({
      userType: type,
      email: '',
      password: '',
      name: '',
      phone: '',
      role: type === 'admin' ? 'SALON_OWNER' : 'Майстер',
      salonId: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      userType: user.userType,
      email: user.email || '',
      password: '',
      name: user.name || '',
      phone: user.phone || '',
      role: user.role,
      salonId: user.salonId || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser 
        ? { id: editingUser.id, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || 'Помилка збереження');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Помилка збереження');
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Видалити ${user.name || user.email}?`)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${user.id}&userType=${user.userType}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const impersonate = async (userId: string) => {
    if (!confirm('Увійти як цей користувач?')) return;

    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        window.location.href = '/dashboard';
      } else {
        const error = await res.json();
        alert(error.error || 'Помилка');
      }
    } catch (error) {
      console.error('Error impersonating:', error);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordModal) return;
    setResettingPassword(true);
    setNewPassword(null);

    try {
      const res = await fetch(`/api/admin/users/${resetPasswordModal.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendVia: resetPasswordSendVia }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.newPassword) {
          setNewPassword(data.newPassword);
        } else {
          alert(data.message);
          setResetPasswordModal(null);
        }
      } else {
        const error = await res.json();
        alert(error.error || 'Помилка');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
    } finally {
      setResettingPassword(false);
    }
  };

  const updateUserRole = async (user: User, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || 'Помилка');
      }
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(s) ||
      u.name?.toLowerCase().includes(s) ||
      u.phone?.includes(s)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Користувачі</h1>
          <p className="text-gray-400 text-sm">Адміністратори та майстри всіх салонів</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="bg-transparent border-white/10 text-white hover:bg-white/5"
            onClick={() => openNewModal('master')}
          >
            <Scissors className="w-4 h-4 mr-2" />
            Новий майстер
          </Button>
          <Button 
            className="bg-violet-600 hover:bg-violet-700"
            onClick={() => openNewModal('admin')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Новий адмін
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${filter === 'all' ? 'border-violet-500' : ''}`}
          onClick={() => setFilter('all')}
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-violet-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-gray-500">Всього</p>
            </div>
          </div>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${filter === 'admin' ? 'border-blue-500' : ''}`}
          onClick={() => setFilter('admin')}
        >
          <div className="flex items-center gap-3">
            <UserCog className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.admins}</p>
              <p className="text-sm text-gray-500">Адміністраторів</p>
            </div>
          </div>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${filter === 'master' ? 'border-orange-500' : ''}`}
          onClick={() => setFilter('master')}
        >
          <div className="flex items-center gap-3">
            <Scissors className="w-5 h-5 text-orange-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.masters}</p>
              <p className="text-sm text-gray-500">Майстрів</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Пошук по email, імені, телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 bg-[#12121a] border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <select
          value={salonFilter}
          onChange={(e) => setSalonFilter(e.target.value)}
          className="px-3 py-2 bg-[#12121a] border border-white/10 rounded-lg text-white text-sm min-w-[200px]"
        >
          <option value="">Всі салони</option>
          {salons.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Users list */}
      <Card className="bg-[#12121a] border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Завантаження...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Користувачів не знайдено</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredUsers.map((user) => (
              <div key={`${user.userType}-${user.id}`} className="p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    user.userType === 'admin' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-orange-500/20 text-orange-400'
                  }`}>
                    {user.userType === 'admin' ? (
                      <UserCog className="w-6 h-6" />
                    ) : (
                      <Scissors className="w-6 h-6" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{user.name || 'Без імені'}</p>
                      {user.userType === 'admin' && user.role === 'SUPER_ADMIN' && (
                        <Shield className="w-4 h-4 text-violet-400" />
                      )}
                      {user.userType === 'master' && user.rating && (
                        <span className="flex items-center gap-1 text-yellow-400 text-sm">
                          <Star className="w-3 h-3 fill-current" />
                          {user.rating.toFixed(1)}
                        </span>
                      )}
                      {user.telegramChatId && (
                        <MessageCircle className="w-4 h-4 text-sky-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {user.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </span>
                      )}
                      {user.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {user.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Salon */}
                  <div className="text-right">
                    {user.salon ? (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Store className="w-4 h-4" />
                        <span className="text-sm">{user.salon.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-600">Без салону</span>
                    )}
                    {user.userType === 'master' && user._count && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 justify-end">
                        <Calendar className="w-3 h-3" />
                        {user._count.bookings} записів
                      </div>
                    )}
                  </div>

                  {/* Role badge */}
                  <div>
                    {user.userType === 'admin' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${
                            user.role === 'SUPER_ADMIN'
                              ? 'bg-violet-500/10 text-violet-400'
                              : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Власник'}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a24] border-white/10">
                          <DropdownMenuItem 
                            onClick={() => updateUserRole(user, 'SALON_OWNER')}
                            className="text-gray-300 focus:text-white focus:bg-white/10"
                          >
                            <CheckCircle className={`w-4 h-4 mr-2 ${user.role === 'SALON_OWNER' ? 'text-green-400' : 'opacity-0'}`} />
                            Власник салону
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateUserRole(user, 'SUPER_ADMIN')}
                            className="text-gray-300 focus:text-white focus:bg-white/10"
                          >
                            <CheckCircle className={`w-4 h-4 mr-2 ${user.role === 'SUPER_ADMIN' ? 'text-green-400' : 'opacity-0'}`} />
                            Super Admin
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {user.userType === 'master' && (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.isActive 
                          ? 'bg-green-500/10 text-green-400' 
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                        {user.isActive ? 'Активний' : 'Неактивний'}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#1a1a24] border-white/10">
                      {user.userType === 'admin' && user.role !== 'SUPER_ADMIN' && (
                        <DropdownMenuItem 
                          onClick={() => impersonate(user.id)}
                          className="text-gray-300 focus:text-white focus:bg-white/10"
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          Увійти як
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => openEditModal(user)}
                        className="text-gray-300 focus:text-white focus:bg-white/10"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Редагувати
                      </DropdownMenuItem>
                      {user.userType === 'admin' && (
                        <DropdownMenuItem 
                          onClick={() => setResetPasswordModal(user)}
                          className="text-gray-300 focus:text-white focus:bg-white/10"
                        >
                          <Key className="w-4 h-4 mr-2" />
                          Скинути пароль
                        </DropdownMenuItem>
                      )}
                      {user.telegramChatId && (
                        <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-white/10">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Написати в Telegram
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(user)}
                        className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Видалити
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Редагувати' : 'Новий'} {formData.userType === 'admin' ? 'адміністратор' : 'майстер'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Ім'я</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Іван Петренко"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Телефон</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="+380501234567"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">
                Пароль {editingUser && '(залиште порожнім щоб не змінювати)'}
              </Label>
              <PasswordInput
                value={formData.password}
                onChange={(val) => setFormData({ ...formData, password: val })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Салон</Label>
              <select
                value={formData.salonId}
                onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                <option value="">Без салону</option>
                {salons.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {formData.userType === 'admin' && (
              <div className="space-y-2">
                <Label className="text-gray-400">Роль</Label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                >
                  <option value="SALON_OWNER">Власник салону</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5"
              >
                Скасувати
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-violet-600 hover:bg-violet-700"
              >
                {editingUser ? 'Зберегти' : 'Створити'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={!!resetPasswordModal} onOpenChange={() => { setResetPasswordModal(null); setNewPassword(null); }}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Скинути пароль</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {newPassword ? (
              <div className="space-y-4">
                <p className="text-gray-300">Новий пароль:</p>
                <div className="p-4 bg-violet-500/10 rounded-lg">
                  <p className="font-mono text-xl text-violet-400 text-center">{newPassword}</p>
                </div>
                <p className="text-sm text-gray-500">
                  Збережіть цей пароль! Він більше не буде показаний.
                </p>
                <Button
                  onClick={() => { setResetPasswordModal(null); setNewPassword(null); }}
                  className="w-full bg-violet-600 hover:bg-violet-700"
                >
                  Закрити
                </Button>
              </div>
            ) : (
              <>
                <p className="text-gray-300">
                  Скинути пароль для <strong className="text-white">{resetPasswordModal?.name || resetPasswordModal?.email}</strong>?
                </p>

                <div className="space-y-2">
                  <Label className="text-gray-400">Надіслати новий пароль через:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setResetPasswordSendVia('email')}
                      className={`p-3 rounded-lg border transition-colors ${
                        resetPasswordSendVia === 'email'
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-white/10 hover:bg-white/5'
                      }`}
                      disabled={!resetPasswordModal?.email}
                    >
                      <Mail className={`w-5 h-5 mx-auto mb-1 ${resetPasswordSendVia === 'email' ? 'text-violet-400' : 'text-gray-500'}`} />
                      <p className="text-sm text-white">Email</p>
                    </button>
                    <button
                      onClick={() => setResetPasswordSendVia('telegram')}
                      className={`p-3 rounded-lg border transition-colors ${
                        resetPasswordSendVia === 'telegram'
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-white/10 hover:bg-white/5'
                      }`}
                      disabled={!resetPasswordModal?.telegramChatId}
                    >
                      <MessageCircle className={`w-5 h-5 mx-auto mb-1 ${resetPasswordSendVia === 'telegram' ? 'text-violet-400' : 'text-gray-500'}`} />
                      <p className="text-sm text-white">Telegram</p>
                    </button>
                  </div>
                  <button
                    onClick={() => setResetPasswordSendVia('none')}
                    className={`w-full p-2 rounded-lg border transition-colors ${
                      resetPasswordSendVia === 'none'
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <p className="text-sm text-gray-400">Показати пароль (не надсилати)</p>
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setResetPasswordModal(null)}
                    className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5"
                  >
                    Скасувати
                  </Button>
                  <Button
                    onClick={handleResetPassword}
                    disabled={resettingPassword}
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                  >
                    {resettingPassword ? 'Скидання...' : 'Скинути'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
