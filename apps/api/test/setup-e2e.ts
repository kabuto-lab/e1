/**
 * Глобальный setup для e2e-тестов.
 * Подтягивает репо-корневой .env (DATABASE_URL, JWT_SECRET, TELEGRAM_BOT_SECRET, …),
 * чтобы тесты работали с той же БД/секретами, что и dev API.
 *
 * ВАЖНО: для полноценной изоляции нужен testcontainers/docker-compose test profile —
 * сейчас тесты бегут по той же dev-БД. Достаточно для skeleton'а, но ломается, если:
 *   • два test-run'а параллельно;
 *   • в dev-БД уже есть активные bookings с совпадающими memo.
 * TODO (следующая итерация): поднять testcontainers Postgres и чистое состояние в beforeEach.
 */

import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

loadDotenv({ path: resolve(__dirname, '../../../.env') });

// Если JWT_SECRET не задан — подставим дефолт, чтобы тесты не падали на bootstrap.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = '0'.repeat(64);
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = '1'.repeat(64);
}
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = 'a'.repeat(64);
}
