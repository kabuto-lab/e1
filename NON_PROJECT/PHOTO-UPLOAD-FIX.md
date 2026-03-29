# 🖼️ Photo Upload Fix — owner_id error

**Issue:** `null value in column "owner_id" of relation "media_files" violates not-null constraint`

---

## 🔍 ПРИЧИНА

Backend получает `owner_id = null` при загрузке фото.

**Две возможные причины:**

1. **Нет JWT токена в localStorage**
   - Пользователь не залогинен
   - Токен истёк

2. **JWT Guard не извлекает userId**
   - Заглушка возвращает `userId: null`

---

## ✅ РЕШЕНИЕ

### Шаг 1: Проверить JWT Token

Открыть DevTools → Application → Local Storage

**Должно быть:**
```javascript
accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
user: {"id":"...","email":"...","role":"admin"}
```

**Если нет:**
1. Выйти из системы
2. Зайти снова через `/admin-login.html`
3. Email: `admin@lovnge.local`
4. Password: `Admin123!`

### Шаг 2: Проверить что токен работает

Открыть DevTools → Console и выполнить:
```javascript
const token = localStorage.getItem('accessToken');
console.log('Token:', token ? '✅ Exists' : '❌ Missing');

// Decode JWT payload
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Payload:', payload);
  console.log('User ID:', payload.sub);
  console.log('Role:', payload.role);
  console.log('Expired:', payload.exp * 1000 < Date.now());
}
```

**Ожидаемый результат:**
```
Token: ✅ Exists
Payload: {sub: "uuid...", email: "admin@lovnge.local", role: "admin", exp: 1234567890}
User ID: uuid-....
Role: admin
Expired: false
```

### Шаг 3: Проверить что API получает токен

Открыть DevTools → Network → Найти запрос `/v1/profiles/media/presigned`

**Проверить заголовки запроса:**
```
Authorization: Bearer eyJhbGci...
Content-Type: application/json
```

**Если заголовка нет:**
- Проверить `getAuthHeader()` в `lib/api-client.ts`
- Убедиться что токен в localStorage

### Шаг 4: Проверить backend логи

Terminal:
```bash
cd C:\Users\a\Documents\_DEV\Tran\ES\apps\api
npx ts-node -r tsconfig-paths/register src/main.ts
```

Смотреть логи при загрузке фото:
```
[Nest] ... LOG [ProfilesController] Generating presigned URL for user: uuid-...
```

**Если `user: undefined`:**
- JWT Guard не извлекает токен
- Проверить `req.user` в контроллере

---

## 🛠️ DEBUG COMMANDS

### Проверить пользователя в БД
```bash
docker-compose exec postgres psql -U postgres -d companion_db -c "SELECT id, email_hash, role, status FROM users LIMIT 5;"
```

### Пересоздать токен
```javascript
// Console в браузере
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
localStorage.removeItem('user');
window.location.href = '/admin-login.html';
```

### Проверить что JWT Guard работает
```typescript
// apps/api/src/auth/guards/jwt-auth.guard.ts:72-78
// Должно быть:
request['user'] = {
  userId: payload.sub,  // ✅ Из JWT token 'sub' claim
  email: payload.email,
  role: payload.role,
  sessionId: payload.jti,
  iat: payload.iat,
  exp: payload.exp,
};
```

---

## 📋 WORKAROUND (Временное решение)

Если нужно срочно загрузить фото:

1. Залогиниться через `/admin-login.html`
2. Открыть DevTools → Console
3. Проверить что токен есть:
```javascript
console.log('Token:', localStorage.getItem('accessToken'));
```
4. Если токена нет — перезайти
5. Попробовать загрузить фото снова

---

## 🎯 NEXT STEPS

1. ✅ Проверить токен в localStorage
2. ✅ Проверить что токен не истёк
3. ✅ Проверить заголовки запроса в Network tab
4. ✅ Проверить backend логи
5. ⏳ Загрузить фото

**Если всё ещё не работает:**
- Очистить localStorage
- Перезайти
- Проверить DevTools Console на ошибки
