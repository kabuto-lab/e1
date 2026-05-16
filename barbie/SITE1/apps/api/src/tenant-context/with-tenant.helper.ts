/**
 * withTenant() — Drizzle helper для гарантированного добавления `tenant_id` в WHERE.
 *
 * Это **Layer 2** из 4-слойной изоляции (см. ARCHITECTURE.md §4).
 * Идея: в каждом репозитории/сервисе НЕ писать руками `.where(eq(table.tenantId, id))`
 * — а оборачивать в `withTenant(query, tenantId, table.tenantId)`. Тогда даже если
 * разработчик забыл — helper докинет условие.
 *
 * Использование:
 *
 *   const rows = await withTenant(
 *     db.select().from(salons).where(eq(salons.status, 'active')),
 *     ctx.tenantId,
 *     salons.tenantId,
 *   );
 *
 * Под капотом просто добавляет `AND tenant_id = $1` к существующему WHERE.
 */
import { and, eq, SQL, type AnyColumn } from 'drizzle-orm';

type SelectQueryBuilder<T> = {
  where: (cond: SQL) => T;
  // Drizzle тайпы не экспортируют точный публичный интерфейс — используем дак-типизацию
};

/**
 * Оборачивает query, добавляя `AND tenant_id = $tenantId`.
 * Если query уже имеет .where() — Drizzle совмещает условия через AND по дефолту.
 *
 * @param query Drizzle query builder (select/update/delete) с цепочкой .from()/.where()
 * @param tenantId UUID текущего тенанта
 * @param tenantIdColumn колонка `<table>.tenantId` в Drizzle-схеме
 */
export function withTenant<T extends SelectQueryBuilder<T>>(
  query: T,
  tenantId: string,
  tenantIdColumn: AnyColumn,
): T {
  return query.where(eq(tenantIdColumn, tenantId));
}

/**
 * Если у query уже есть условие — комбинирует через AND.
 * Применяется, когда хочется явно собрать условие до .where():
 *
 *   .where(combineTenant(tenantId, salons.tenantId, eq(salons.status, 'active')))
 */
export function combineTenant(
  tenantId: string,
  tenantIdColumn: AnyColumn,
  ...extraConditions: (SQL | undefined)[]
): SQL {
  const conds = [eq(tenantIdColumn, tenantId), ...extraConditions.filter((c): c is SQL => !!c)];
  return and(...conds) as SQL;
}
