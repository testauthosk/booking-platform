# TODO — Налаштування (Settings)

## ✅ Done (Wave 1 — commit 16578bd)
- [x] Schema: booking rules, cancellation policy, notification settings на Salon
- [x] Schema: isBlocked, blockReason, noShowCount, birthday на Client
- [x] API: GET/PUT /api/settings/booking-rules
- [x] API: GET/PUT /api/settings/notifications
- [x] UI: /setup/booking-rules (lead time, advance, slot step, confirmation, cancellation)
- [x] UI: /setup/notifications (channels, reminders, birthday, return)
- [x] UI: /setup/telegram (status, deep link, how it works)
- [x] UI: /setup/subscription (Free/Pro/Business comparison)
- [x] UI: /setup/security (password change, danger zone)
- [x] UI: /setup/page.tsx redesigned (9 sections)
- [x] Logic: public booking enforces minLeadTime, maxAdvance, isBlocked, requireConfirmation
- [x] Logic: cancel API uses salon.cancelDeadlineHours

## 🔜 TODO — Quick wins
- [ ] Per-service: `isOnlineBookable` field on Service (default true)
- [ ] Per-master: `isOnlineBookable` field on Master (default true)
- [ ] Filter in /api/slots and public page — hide non-bookable services/masters
- [ ] Show bookingWarningText on public salon page before booking form

## 🔜 TODO — Notifications logic (make toggles actually work)
- [ ] Refactor /api/reminders/send — read salon's notifyReminder24h/2h/1h settings
- [ ] After-visit message — trigger on COMPLETED status change
- [ ] Birthday auto-greeting — daily cron, check clients with birthday today
- [ ] Return clients — cron, check lastVisit > notifyReturnDays
- [ ] Test send button in /setup/notifications UI

## 🔜 TODO — Subscription enforcement
- [ ] Enforce maxMasters limit on invitation accept
- [ ] Enforce maxServices limit on service create
- [ ] Paywall component — trigger from different entry points
- [ ] SMS channel — check plan before enabling

## 🔜 TODO — Security
- [ ] POST /api/auth/change-password — implement if not exists
- [ ] Active sessions list (TrustedDevice)
- [ ] Logout all sessions except current
- [ ] Delete account API + confirmation flow

## 🔜 TODO — Permissions / Roles
- [ ] /setup/permissions page
- [ ] Role matrix: Owner / Admin / Master — what each sees
- [ ] Middleware role check on sensitive APIs
- [ ] Invite admin (email invite with role)

## 🔜 TODO — Integrations
- [ ] /setup/integrations page
- [ ] Google Maps "Записатися" button — instructions
- [ ] Instagram booking link
- [ ] CSV client import
- [ ] Webhook URL (stub for API access)

## 📋 Deferred (post-launch)
- [ ] Timezone-aware booking rules (for multi-country support)
- [ ] Optimal Time algorithm (LCM of service durations, like Dikidi)
- [ ] Smart pricing (peak/off-peak)
- [ ] Move settings to separate SalonSettings table (when 20+ fields)
- [ ] Per-service cancellation policy override
