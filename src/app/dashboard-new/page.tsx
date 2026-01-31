"use client";

import { useState } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  CalendarCheck, 
  CreditCard, 
  Users, 
  Scissors, 
  Sparkles,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Printer,
  Plus,
  MoreHorizontal
} from 'lucide-react';

// Fake data for now
const stats = [
  { label: 'Total Clients', value: '980', gradient: 'from-orange-500 to-orange-600', icon: '👥' },
  { label: 'Total Appointments', value: '1205', gradient: 'from-teal-500 to-cyan-600', icon: '📅' },
  { label: 'Total Services', value: '86', gradient: 'from-emerald-500 to-green-600', icon: '✂️' },
  { label: 'Total Treatments', value: '36', gradient: 'from-purple-500 to-violet-600', icon: '💆' },
];

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Calendar, label: 'Calendar' },
  { icon: CalendarCheck, label: 'Appointments' },
  { icon: CreditCard, label: 'Payments' },
  { icon: Users, label: 'Customers' },
  { icon: Scissors, label: 'Services' },
  { icon: Sparkles, label: 'Treatments' },
  { icon: Settings, label: 'Settings' },
];

const upcomingAppointments = [
  { name: 'Sang Whoo', service: 'Hair Cut & Styling', time: '10:30', master: 'Robert', price: 160, avatar: 'https://i.pravatar.cc/100?img=1' },
  { name: 'Wade Warren', service: 'Hair Cut & Spa', time: '11:30', master: 'Robert', price: 340, avatar: 'https://i.pravatar.cc/100?img=2' },
  { name: 'Colleen', service: 'Hair Cut', time: '10:30', master: 'Robert', price: 100, avatar: 'https://i.pravatar.cc/100?img=3' },
  { name: 'Greg', service: 'Hair Cut & Facial', time: '10:30', master: 'Robert', price: 450, avatar: 'https://i.pravatar.cc/100?img=4' },
  { name: 'Esther', service: 'Hair Cut & Beard', time: '10:30', master: 'Robert', price: 190, avatar: 'https://i.pravatar.cc/100?img=5' },
];

const scheduleData = [
  { time: '09:00', slots: [
    { master: 'Albert', service: 'Hair Cut\nBotox', color: 'bg-amber-500' },
    null,
    { master: 'Jacob', service: 'Hair Cut\nNail Art', color: 'bg-teal-500' },
    null,
  ]},
  { time: '10:00', slots: [
    { master: 'Albert', service: 'Hair Cut', color: 'bg-amber-500' },
    { master: 'Robert', service: 'Hair Style\nBeard', color: 'bg-rose-500' },
    null,
    { master: 'Leslie', service: 'Hair Cut\nHead Massage\nWaxing\nEyebrows', color: 'bg-violet-500' },
  ]},
  { time: '11:00', slots: [
    { master: 'Albert', service: 'Hair Style\nBeard', color: 'bg-amber-500' },
    null,
    { master: 'Jacob', service: 'Waxing', color: 'bg-teal-500' },
    null,
  ]},
  { time: '12:00', slots: [
    { master: 'Albert', service: 'Hair Style\nBotox\nFillers', color: 'bg-amber-500' },
    null,
    { master: 'Jacob', service: 'Pedicure\nManicure', color: 'bg-teal-500' },
    null,
  ]},
];

const masters = [
  { name: 'Albert', color: 'bg-amber-500' },
  { name: 'Robert', color: 'bg-rose-500' },
  { name: 'Jacob', color: 'bg-teal-500' },
  { name: 'Leslie', color: 'bg-violet-500' },
];

export default function DashboardNew() {
  const [activeNav, setActiveNav] = useState('Dashboard');

  return (
    <div className="min-h-screen bg-[#1a1d24] text-white flex">
      {/* Sidebar */}
      <aside className="w-56 bg-[#1e2028] flex flex-col border-r border-gray-800">
        {/* Logo */}
        <div className="p-6">
          <h1 className="text-xl font-bold text-white">Zolmilon.</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveNav(item.label)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                activeNav === item.label
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 space-y-2">
          <button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium transition-colors">
            Add Client
          </button>
          <button className="w-full bg-transparent border border-gray-600 hover:border-gray-500 text-gray-300 py-3 rounded-lg font-medium transition-colors">
            Add Hairstylist
          </button>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-gray-800">
          <button className="w-full flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-16 bg-[#1e2028] border-b border-gray-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-300">
              <Scissors className="w-4 h-4" />
              <span className="text-sm">Select Salon</span>
              <ChevronRight className="w-4 h-4 rotate-90" />
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-sm">Working Staff</span>
              <ChevronRight className="w-4 h-4 rotate-90" />
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-800 rounded-lg">
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              <span className="text-sm font-medium">Today</span>
              <button className="p-2 hover:bg-gray-800 rounded-lg">
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button className="text-sm text-gray-400 hover:text-white">Jump</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-800 rounded-lg">
              <Printer className="w-5 h-5 text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-800 rounded-lg relative">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-300">Alex Sharapova</span>
              <img 
                src="https://i.pravatar.cc/40?img=10" 
                alt="Avatar" 
                className="w-10 h-10 rounded-full"
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 flex gap-6 overflow-auto">
          {/* Left & Center Content */}
          <div className="flex-1 space-y-6">
            {/* Overview */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Overview</h2>
                <button className="text-sm text-gray-400 flex items-center gap-1">
                  This Month <ChevronRight className="w-4 h-4 rotate-90" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                  <div 
                    key={i}
                    className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-5 relative overflow-hidden`}
                  >
                    <div className="absolute top-3 right-3 opacity-30">
                      <MoreHorizontal className="w-5 h-5" />
                    </div>
                    <div className="text-3xl mb-1">{stat.icon}</div>
                    <div className="text-3xl font-bold mb-1">{stat.value}</div>
                    <div className="text-sm text-white/80">{stat.label}</div>
                    {/* Decorative waves */}
                    <div className="absolute bottom-0 right-0 w-24 h-24 opacity-20">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <circle cx="80" cy="80" r="40" fill="white" />
                        <circle cx="90" cy="90" r="30" fill="white" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Day Schedule & Statistics */}
            <div className="grid grid-cols-2 gap-6">
              {/* Day Schedule */}
              <div className="bg-[#1e2028] rounded-2xl p-5 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Day Schedule</h3>
                    <p className="text-sm text-gray-500">Appointments booking chart</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-1 hover:bg-gray-800 rounded">
                      <ChevronLeft className="w-4 h-4 text-gray-400" />
                    </button>
                    <button className="p-1 hover:bg-gray-800 rounded">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Master Legend */}
                <div className="flex items-center gap-4 mb-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                    <span className="text-gray-400">Availability</span>
                  </div>
                  {masters.map((m) => (
                    <div key={m.name} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${m.color}`}></div>
                      <span className="text-gray-400">{m.name}</span>
                    </div>
                  ))}
                </div>

                {/* Schedule Grid */}
                <div className="space-y-1">
                  {scheduleData.map((row, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-12 text-xs text-gray-500 py-2">{row.time}</div>
                      <div className="flex-1 grid grid-cols-4 gap-1">
                        {row.slots.map((slot, j) => (
                          <div 
                            key={j}
                            className={`rounded-lg p-2 min-h-[40px] ${
                              slot ? slot.color : 'bg-gray-800/50'
                            }`}
                          >
                            {slot && (
                              <div className="text-xs text-white whitespace-pre-line leading-tight">
                                {slot.service}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistics */}
              <div className="space-y-6">
                <div className="bg-[#1e2028] rounded-2xl p-5 border border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">Statistics</h3>
                      <p className="text-sm text-gray-500">Services & selling information</p>
                    </div>
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex gap-4 mb-4">
                    <button className="text-sm text-white border-b-2 border-orange-500 pb-1">Services</button>
                    <button className="text-sm text-gray-500 pb-1">Products</button>
                    <button className="text-sm text-gray-500 pb-1">Treatments</button>
                  </div>
                  {/* Chart placeholder */}
                  <div className="h-32 flex items-end justify-center gap-1">
                    {[40, 60, 45, 80, 65, 90].map((h, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div 
                          className="w-12 bg-gradient-to-t from-teal-600 to-teal-400 rounded-t-lg"
                          style={{ height: `${h}%` }}
                        ></div>
                        <span className="text-xs text-gray-500">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#1e2028] rounded-2xl p-5 border border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">Revenue Generation</h3>
                      <p className="text-sm text-gray-500">It's all about earning</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mb-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-teal-500"></div>
                      <span className="text-gray-400">1k to 3k</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-blue-500"></div>
                      <span className="text-gray-400">3k to 5k</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-orange-500"></div>
                      <span className="text-gray-400">5k +</span>
                    </div>
                  </div>
                  {/* Bar chart placeholder */}
                  <div className="h-24 flex items-end justify-between gap-2">
                    {[
                      { h1: 30, h2: 20, h3: 10 },
                      { h1: 40, h2: 25, h3: 15 },
                      { h1: 35, h2: 30, h3: 20 },
                      { h1: 50, h2: 35, h3: 25 },
                      { h1: 45, h2: 40, h3: 30 },
                      { h1: 60, h2: 45, h3: 35 },
                    ].map((bar, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="flex flex-col-reverse">
                          <div className="w-8 bg-teal-500 rounded-sm" style={{ height: `${bar.h1}px` }}></div>
                          <div className="w-8 bg-blue-500 rounded-sm" style={{ height: `${bar.h2}px` }}></div>
                          <div className="w-8 bg-orange-500 rounded-t-sm" style={{ height: `${bar.h3}px` }}></div>
                        </div>
                        <span className="text-xs text-gray-500">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Upcoming Appointments */}
          <div className="w-72 bg-[#1e2028] rounded-2xl p-5 border border-gray-800 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Upcoming Appointments</h3>
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </div>

            {/* Mini Calendar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">June 2022</span>
                </div>
                <div className="flex gap-1">
                  <button className="p-1 hover:bg-gray-800 rounded">
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </button>
                  <button className="p-1 hover:bg-gray-800 rounded">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-gray-500 py-1">{d}</div>
                ))}
                {[19, 20, 21, 22, 23, 24, 25].map(d => (
                  <div 
                    key={d}
                    className={`py-2 rounded-lg ${
                      d === 21 ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>
            </div>

            {/* Appointments List */}
            <div className="space-y-3">
              {upcomingAppointments.map((apt, i) => (
                <div key={i} className="flex items-center gap-3 p-2 hover:bg-gray-800/50 rounded-lg transition-colors">
                  <img 
                    src={apt.avatar} 
                    alt={apt.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{apt.name}</div>
                    <div className="text-xs text-gray-500 truncate">{apt.service}</div>
                    <div className="text-xs text-gray-500">{apt.time} | {apt.master}</div>
                  </div>
                  <div className="text-orange-500 font-semibold">${apt.price}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
