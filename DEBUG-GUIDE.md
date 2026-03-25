# 🔧 Debug Guide — Lovnge Platform

**Created:** 2026-03-21 21:30 MSK  
**Issue:** API Error: {} при создании анкеты

---

## ✅ НАЙДЕНА И ИСПРАВЛЕНА ПРИЧИНА ОШИБКИ

### Проблема
**API Client** отправлял запросы на:
```
http://localhost:3000/profiles  ❌ (без версии)
```

**Backend** ожидает запросы на:
```
http://localhost:3000/v1/profiles  ✅ (с версией v1)
```

### Причина
В `main.ts` включено API versioning:
```typescript
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
  prefix: 'v',
});
```

Но `api-client.ts` не использовал префикс `/v1/`.

### Решение
Обновлено `apps/web/lib/api-client.ts`:
```typescript
const API_VERSION = '/v1';
const BASE_PATH = `${API_URL}${API_VERSION}`;

// Все endpoint'ы теперь используют BASE_PATH:
fetch(`${BASE_PATH}/profiles`)  // ✅ http://localhost:3000/v1/profiles
```

---

## 🎯 Enhanced Error Handling

### До исправления:
```typescript
console.error('API Error:', {
  status: response.status,
  error: errorData,  // Пустой объект {}
});
```

### После исправления:
```typescript
console.error('🚨 API Error:', {
  url: response.url,           // Полный URL запроса
  status: response.status,      // HTTP статус
  statusText: response.statusText,
  headers: Object.fromEntries(response.headers.entries()),
  errorData: errorData,         // Распарсенные данные
  errorText: errorText,         // Сырой текст ошибки
});
```

---

## 📋 Debug Checklist (Как искать ошибки в будущем)

### 1. Проверить URL endpoint'а
```bash
# Проверить что API слушает
curl http://localhost:3000/v1/health

# Проверить доступные endpoint'ы
curl http://localhost:3000/api/docs-json
```

### 2. Проверить CORS
```bash
curl -I -X OPTIONS http://localhost:3000/v1/profiles \
  -H "Origin: http://localhost:3001"
```

**Ожидаемый ответ:**
```
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Credentials: true
```

### 3. Проверить JWT Token
Открыть DevTools → Application → Local Storage

**Должно быть:**
- `accessToken` (JWT токен)
- `refreshToken` (JWT refresh)
- `user` (JSON с role)

### 4. Посмотреть логи API
```bash
# Terminal 1: API логи
cd C:\Users\a\Documents\_DEV\Tran\ES\apps\api
npx ts-node -r tsconfig-paths/register src/main.ts

# Terminal 2: Docker логи
docker-compose logs -f postgres
docker-compose logs -f redis
```

### 5. Включить подробное логирование
В `api-client.ts` теперь есть детальное логирование:
```typescript
console.log('createProfile request:', requestBody);
console.log('createProfile response status:', response.status);
console.log('createProfile response data:', responseData);
```

---

## 🐛 Типичные ошибки и решения

### Ошибка 1: HTTP 401 Unauthorized
**Причина:** Нет JWT токена или истёк  
**Решение:**
```javascript
// Проверить токен в localStorage
const token = localStorage.getItem('accessToken');
if (!token) {
  window.location.href = '/login';
}
```

### Ошибка 2: HTTP 403 Forbidden
**Причина:** Недостаточно прав (RBAC)  
**Решение:** Проверить роль пользователя:
```javascript
const user = JSON.parse(localStorage.getItem('user'));
if (user.role !== 'admin') {
  alert('Access denied');
}
```

### Ошибка 3: HTTP 404 Not Found
**Причина:** Неверный URL или endpoint не существует  
**Решение:**
1. Проверить префикс `/v1/`
2. Проверить Swagger: http://localhost:3000/api/docs

### Ошибка 4: HTTP 400 Bad Request
**Причина:** Ошибка валидации DTO  
**Решение:** Смотреть детали валидации:
```typescript
// Backend лог покажет:
Validation failed: [
  { property: 'displayName', constraints: { minLength: 'must be longer than 2' } }
]
```

### Ошибка 5: CORS Error
**Причина:** Backend не разрешает origin  
**Решение:** Проверить `.env`:
```env
FRONTEND_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:5500
```

---

## 🛠️ Debug Panel (Frontend)

В Next.js приложении есть встроенный Debug Panel:

1. Откройте http://localhost:3001/dashboard
2. В правом нижнем углу нажмите 🐛 кнопку
3. Вкладки:
   - **Logs** — console.log/error/warn
   - **Network** — все fetch запросы
   - **API Status** — health check endpoint'ов

---

## 📊 Backend Debug Commands

### Включить SQL логирование
```typescript
// apps/api/src/database/database.module.ts
const client = postgres(process.env.DATABASE_URL, {
  debug: true,  // Логгирует все SQL запросы
});
```

### Включить детальную валидацию
```typescript
// apps/api/src/main.ts
app.useGlobalPipes(new ValidationPipe({
  exceptionFactory: (errors) => {
    console.error('Validation failed:', errors);
    return new BadRequestException(errors);
  },
}));
```

### Посмотреть логи в реальном времени
```bash
# Docker контейнеры
docker-compose logs -f --tail=100

# Файлы логов (если настроены)
tail -f logs/application-$(date +%Y-%m-%d).log
```

---

## 🎯 Testing API Manually

### Создать профиль (curl)
```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lovnge.local","password":"Admin123!"}' \
  | jq -r '.accessToken')

# 2. Create profile
curl -X POST http://localhost:3000/v1/profiles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "displayName": "Test Model",
    "age": 25,
    "height": 170
  }'
```

---

## 📝 Next Steps

1. ✅ **Исправлено:** API client использует `/v1/` префикс
2. ✅ **Исправлено:** Enhanced error logging
3. ⏳ **Тестировать:** Попробовать создать анкету снова
4. ⏳ **Проверить:** Посмотреть логи в консоли браузера

**Команда для теста:**
```bash
cd C:\Users\a\Documents\_DEV\Tran\ES\apps\web
npm run dev
```

Открыть: http://localhost:3001/dashboard/models/create
