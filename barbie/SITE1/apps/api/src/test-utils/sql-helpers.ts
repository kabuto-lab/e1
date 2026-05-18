/**
 * Test helpers для проверки tenant-isolation invariant'ов (ENTITY §2.2).
 *
 * Drizzle SQL объект — это `{ queryChunks: SQLChunk[] }`. queryChunks содержит
 * вложенные `Column` ссылки и параметрические значения. Нам не нужна полная
 * сериализация в SQL-строку — достаточно убедиться что в дереве chunks
 * присутствует `(column = value)` для `tenant_id` колонки нужной таблицы и
 * tenant-id значения.
 *
 * `expectTenantFilter(whereArg, tenantIdColumn, expectedTenantId)` обходит
 * queryChunks рекурсивно и:
 *  - находит Column-chunk, чей name === tenantIdColumn.name + table === column.table
 *  - проверяет, что рядом (в той же SQL conjunction) есть Param с value === expectedTenantId
 *
 * Это покрывает оба паттерна:
 *  - `.where(eq(table.tenantId, id))`
 *  - `.where(and(eq(table.tenantId, id), ...))` (Drizzle `and` разворачивает в conjunction)
 *  - `.where(combineTenant(id, table.tenantId, ...))`
 */
import type { AnyColumn, SQL } from 'drizzle-orm';
import type { TenantContextService } from '../tenant-context/tenant-context.service';

interface ChunkLike {
  queryChunks?: unknown[];
  value?: unknown;
  values?: unknown[];
  name?: string;
  table?: { _: { name: string } };
}

/**
 * Возвращает true, если в дереве queryChunks есть упоминание (`column.tenantId` ==
 * `expectedTenantId`).
 */
export function whereHasTenantFilter(
  whereArg: SQL | undefined,
  tenantIdColumn: AnyColumn,
  expectedTenantId: string,
): boolean {
  if (!whereArg) return false;

  const colMeta = tenantIdColumn as unknown as { name: string; table: { _: { name: string } } };
  const targetColName = colMeta.name;
  const targetTableName = colMeta.table?._?.name;

  let foundColumn = false;
  let foundValue = false;

  function walk(node: unknown): void {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (typeof node !== 'object') {
      // Param values often serialize as `{ value: string }` via Param wrapper —
      // но иногда Drizzle кладёт прямо строку. Проверим тут на raw string.
      if (typeof node === 'string' && node === expectedTenantId) {
        foundValue = true;
      }
      return;
    }
    const obj = node as ChunkLike;
    if (obj.name === targetColName && obj.table?._?.name === targetTableName) {
      foundColumn = true;
    }
    if (obj.value === expectedTenantId) {
      foundValue = true;
    }
    if (obj.queryChunks) walk(obj.queryChunks);
    if (obj.values) walk(obj.values);
  }

  walk(whereArg as unknown);
  return foundColumn && foundValue;
}

/**
 * Jest matcher-friendly assertion. Бросает с понятным message'ем если не нашёл.
 */
export function expectTenantFilter(
  whereArgs: SQL[],
  tenantIdColumn: AnyColumn,
  expectedTenantId: string,
): void {
  const hit = whereArgs.some((w) => whereHasTenantFilter(w, tenantIdColumn, expectedTenantId));
  if (!hit) {
    const colMeta = tenantIdColumn as unknown as { name: string; table: { _: { name: string } } };
    const colDesc = `${colMeta.table?._?.name ?? '?'}.${colMeta.name}`;
    throw new Error(
      `Expected at least one .where() to filter by ${colDesc} === ${expectedTenantId}, ` +
        `but ${whereArgs.length} recorded .where() calls had no matching tenant filter.`,
    );
  }
}

/** Factory: mock TenantContextService возвращающий заданный tenantId. */
export function mockTenantContext(tenantId: string | null): TenantContextService {
  return {
    getContext: () =>
      tenantId
        ? { tenantId, tenantSlug: 'test-slug', status: 'active' as const }
        : null,
    requireTenantId: () => {
      if (!tenantId) {
        throw new Error('TenantContext is missing');
      }
      return tenantId;
    },
    run: <T>(_ctx: unknown, fn: () => T) => fn(),
  } as unknown as TenantContextService;
}
