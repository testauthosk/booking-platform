# Schema Mapping: Fresha UI → Prisma DB

## Страница салона (Fresha-style)

### 🏪 SALON (Визитка салона)

| UI Element | Frontend Field | Prisma Model.field | Type |
|------------|----------------|-------------------|------|
| Название | name | Salon.name | String |
| URL-slug | slug | Salon.slug | String (unique) |
| Тип | type | Salon.type | String ("Барбершоп", "Перукарня") |
| Описание | description | Salon.description | String? |
| Телефон | phone | Salon.phone | String? |
| Email | email | Salon.email | String? |
| Полный адрес | address | Salon.address | String? |
| Короткий адрес | short_address | Salon.shortAddress | String? |
| Координаты | coordinates_lat/lng | Salon.latitude/longitude | Float? |
| Фото галереи | photos[] | Salon.photos | String[] |
| Часы работы | working_hours | Salon.workingHours | Json |
| Удобства | amenities[] | Salon.amenities | String[] |
| Рейтинг | rating | Salon.rating | Float |
| Кол-во отзывов | review_count | Salon.reviewCount | Int |
| Активен | is_active | Salon.isActive | Boolean |
| Владелец | owner_id | Salon.ownerId | String? |

### 📋 SERVICE CATEGORIES (Категории услуг)

| UI Element | Frontend Field | Prisma Model.field | Type |
|------------|----------------|-------------------|------|
| Название | name | ServiceCategory.name | String |
| Порядок | sort_order | ServiceCategory.sortOrder | Int |
| Привязка | salon_id | ServiceCategory.salonId | String |

### 💇 SERVICES (Услуги)

| UI Element | Frontend Field | Prisma Model.field | Type |
|------------|----------------|-------------------|------|
| Название | name | Service.name | String |
| Описание | description | Service.description | String? |
| Цена | price | Service.price | Int |
| "від" (от) | price_from | Service.priceFrom | Boolean |
| Длительность | duration_minutes | Service.duration | Int (минуты) |
| Отображение | duration | `${duration} хв` | Computed |
| Категория | category_id | Service.categoryId | String? |
| Активна | is_active | Service.isActive | Boolean |
| Порядок | sort_order | Service.sortOrder | Int |

### 👨‍💼 MASTERS (Мастера)

| UI Element | Frontend Field | Prisma Model.field | Type |
|------------|----------------|-------------------|------|
| Имя | name | Master.name | String |
| Должность | role | Master.role | String? ("Барбер", "Стиліст") |
| Фото | avatar | Master.avatar | String? (URL) |
| Рейтинг | rating | Master.rating | Float |
| Отзывы | review_count | Master.reviewCount | Int |
| Базовая цена | price | Master.price | Int |
| Активен | is_active | Master.isActive | Boolean |
| Порядок | sort_order | Master.sortOrder | Int |
| График | working_hours | Master.workingHours | Json? |

### 📅 BOOKINGS (Записи)

| UI Element | Frontend Field | Prisma Model.field | Type |
|------------|----------------|-------------------|------|
| Имя клиента | client_name | Booking.clientName | String |
| Телефон | client_phone | Booking.clientPhone | String |
| Email | client_email | Booking.clientEmail | String? |
| Дата | date | Booking.date | String ("2024-01-15") |
| Время начала | time | Booking.time | String ("14:00") |
| Время конца | time_end | Booking.timeEnd | String? |
| Длительность | duration_minutes | Booking.duration | Int |
| Цена | price | Booking.price | Int |
| Заметки | notes | Booking.notes | String? |
| Статус | status | Booking.status | Enum |
| Уведомление | notification_sent | Booking.notificationSent | Boolean |
| Услуга (имя) | service_name | Booking.serviceName | String? |
| Мастер (имя) | master_name | Booking.masterName | String? |

**Статусы:** PENDING | CONFIRMED | COMPLETED | CANCELLED | NO_SHOW

### ⭐ REVIEWS (Отзывы)

| UI Element | Frontend Field | Prisma Model.field | Type |
|------------|----------------|-------------------|------|
| Автор | author_name | Review.authorName | String |
| Инициал | author_initial | Review.authorInitial | String |
| Цвет аватара | author_color | Review.authorColor | String |
| Рейтинг | rating | Review.rating | Int (1-5) |
| Текст | text | Review.text | String? |
| Услуга | service_name | Review.serviceName | String? |
| Видимый | — | Review.isVisible | Boolean |

### 👥 CLIENTS (Клиенты салона)

| UI Element | Frontend Field | Prisma Model.field | Type |
|------------|----------------|-------------------|------|
| Имя | name | Client.name | String |
| Телефон | phone | Client.phone | String |
| Email | email | Client.email | String? |
| Визитов | visits_count | Client.visitsCount | Int |
| Потрачено | total_spent | Client.totalSpent | Int |
| Последний визит | last_visit | Client.lastVisit | DateTime? |
| Заметки | notes | Client.notes | String? |

### 👤 USERS (Авторизация)

| UI Element | Frontend Field | Prisma Model.field | Type |
|------------|----------------|-------------------|------|
| Email | email | User.email | String (unique) |
| Пароль | — | User.passwordHash | String |
| Имя | name | User.name | String? |
| Роль | role | User.role | Enum |
| Салон | salon_id | User.salonId | String? |
| Telegram | telegram_chat_id | User.telegramChatId | String? |
| Уведомления | notifications_enabled | User.notificationsEnabled | Boolean |

**Роли:** SUPER_ADMIN | SALON_OWNER | MASTER

---

## Working Hours Format (JSON)

```json
[
  { "day": "Понеділок", "is_working": true, "open": "09:00", "close": "20:00" },
  { "day": "Вівторок", "is_working": true, "open": "09:00", "close": "20:00" },
  { "day": "Середа", "is_working": true, "open": "09:00", "close": "20:00" },
  { "day": "Четвер", "is_working": true, "open": "09:00", "close": "20:00" },
  { "day": "П'ятниця", "is_working": true, "open": "09:00", "close": "20:00" },
  { "day": "Субота", "is_working": true, "open": "10:00", "close": "18:00" },
  { "day": "Неділя", "is_working": false, "open": "", "close": "" }
]
```

---

## Frontend → API Mapping

| Page | Component | API Route | Method |
|------|-----------|-----------|--------|
| /salon/[slug] | SalonPage | /api/salon/[slug] | GET |
| /salon/[slug] | BookingModal | /api/booking | POST |
| /login | LoginPage | /api/auth/[...nextauth] | POST |
| /dashboard | DashboardPage | /api/dashboard/* | Various |

---

## Indices (уже в Prisma schema)

- Salon: slug, isActive
- Service: salonId, categoryId
- Master: salonId, isActive
- Booking: salonId, masterId, clientId, date, status
- Client: salonId, phone
- Review: salonId, masterId, rating
- User: email, salonId
