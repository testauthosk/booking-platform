# TODO — Тестовый запуск Tholim

## 🔴 Блокеры (без этого не запускаем)
- [x] Домены настроены (tholim.com → landing, app.tholim.com → platform, *.tholim.com → salons)
- [x] NEXTAUTH_URL = https://app.tholim.com
- [x] Telegram webhook = app.tholim.com
- [x] Resend email работает с noreply@tholim.com
- [ ] **Календарь мастера** — перенести resource grid из главного календаря (свой столбец)
- [ ] **"Записати колегу"** — полный календарь всех мастеров в staff panel

## 🟡 Важно (делаем сразу после блокеров)
- [ ] Notification toggles реально работают (reminders/send читает salon settings)
- [ ] slotStepMinutes применяется в /api/slots
- [ ] bookingWarningText показывается на публичной странице
- [ ] isOnlineBookable на Service и Master (фильтр в slots + public page)

## 🟢 Можно после запуска
- [ ] Subscription enforcement (maxMasters, maxServices, paywall)
- [ ] POST /api/auth/change-password
- [ ] Active sessions list (TrustedDevice)
- [ ] Delete account API
- [ ] Permissions/Roles page
- [ ] Integrations page (Google Maps button, Instagram link, CSV import)
- [ ] After-visit notification (trigger on COMPLETED)
- [ ] Birthday auto-greeting (daily cron)
- [ ] Return clients reminder (cron)
- [ ] Move CRON off OpenClaw → Railway cron
- [ ] Payment integration (LiqPay/Monobank)
- [ ] Native apps (iOS/Android)

## 📋 Tech debt
- [ ] 13+ @ts-nocheck files
- [ ] any types in admin endpoints
- [ ] In-memory rate limit → Redis
- [ ] Duplicate /api/booking and /api/bookings endpoints
- [ ] calendar-test page cleanup
- [ ] custom-calendar-backup file cleanup
