/**
 * В БД часто лежат cdnUrl вида http://localhost:9000/... (как задал API при загрузке).
 * Браузер пользователя не может ходить на localhost сервера → блокировки и битые картинки.
 * Если задан NEXT_PUBLIC_MINIO_PUBLIC_URL (например http://45.9.40.37:9000), подменяем хост.
 */
export function publicMediaUrl(url: string | null | undefined): string {
  if (url == null) return '';
  const s = String(url).trim();
  if (!s) return '';
  const base = process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL?.trim().replace(/\/$/, '');
  if (!base) return s;
  return s.replace(/^https?:\/\/(localhost|127\.0\.0\.1):9000(?=\/|$)/i, base);
}
