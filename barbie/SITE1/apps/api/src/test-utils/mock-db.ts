/**
 * Mock Drizzle Database — for unit tests of *.service.ts files.
 *
 * Записывает все вызовы chain'а (select/from/where/insert/update/delete/values/set/
 * leftJoin/innerJoin/orderBy/groupBy/limit/offset/returning) и возвращает chainable
 * proxy. Терминал (await) — резолвится в `result` массив, который тест задаёт через
 * `.queueResult([...])`.
 *
 * Цель — verify, что код вызывает .where() с условием, содержащим
 * `eq(table.tenantId, currentTenantId)` (см. expectTenantFilter в sql-helpers.ts).
 *
 * Что НЕ покрывается: реальный SQL semantics, JOIN-семантика, типизация Drizzle.
 * Для этого нужен integration test с реальным Postgres.
 */
import type { SQL } from 'drizzle-orm';

export interface RecordedCall {
  method: string;
  args: unknown[];
}

export interface MockDb {
  /** Все вызовы chain'а, в порядке. */
  readonly calls: RecordedCall[];
  /** Очистить историю + queued results. */
  reset(): void;
  /** Задать результат для следующего терминального await (FIFO). */
  queueResult<T = unknown>(rows: T): void;
  /** Mock метода transaction(cb): по умолчанию передаёт `this` как tx и await'ит cb. */
  transaction: jest.Mock;
  /** Cast в Database для DI. */
  asDatabase<T>(): T;

  // Chainable surface — все возвращают сам proxy.
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  from: jest.Mock;
  where: jest.Mock;
  values: jest.Mock;
  set: jest.Mock;
  leftJoin: jest.Mock;
  innerJoin: jest.Mock;
  orderBy: jest.Mock;
  groupBy: jest.Mock;
  limit: jest.Mock;
  offset: jest.Mock;
  returning: jest.Mock;
  for: jest.Mock;
  onConflictDoUpdate: jest.Mock;
  onConflictDoNothing: jest.Mock;
}

export function createMockDb(): MockDb {
  const calls: RecordedCall[] = [];
  const queue: unknown[] = [];

  let proxyRef: MockDb;

  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return proxyRef;
    };

  const terminalThen = (onFulfilled?: (value: unknown) => unknown) => {
    // FIFO queue; default = пустой массив (большинство select'ов).
    const value = queue.length > 0 ? queue.shift() : [];
    return Promise.resolve(value).then(onFulfilled);
  };

  proxyRef = {
    calls,
    reset() {
      calls.length = 0;
      queue.length = 0;
    },
    queueResult<T>(rows: T) {
      queue.push(rows);
    },
    transaction: jest.fn(async (cb: (tx: MockDb) => Promise<unknown>) => {
      // tx = тот же mock; в реальных тестах при необходимости override'ить.
      return await cb(proxyRef);
    }),
    asDatabase<T>(): T {
      return proxyRef as unknown as T;
    },

    select: jest.fn(record('select')),
    insert: jest.fn(record('insert')),
    update: jest.fn(record('update')),
    delete: jest.fn(record('delete')),
    from: jest.fn(record('from')),
    where: jest.fn(record('where')),
    values: jest.fn(record('values')),
    set: jest.fn(record('set')),
    leftJoin: jest.fn(record('leftJoin')),
    innerJoin: jest.fn(record('innerJoin')),
    orderBy: jest.fn(record('orderBy')),
    groupBy: jest.fn(record('groupBy')),
    limit: jest.fn(record('limit')),
    offset: jest.fn(record('offset')),
    returning: jest.fn(record('returning')),
    for: jest.fn(record('for')),
    onConflictDoUpdate: jest.fn(record('onConflictDoUpdate')),
    onConflictDoNothing: jest.fn(record('onConflictDoNothing')),
  };

  // Make await proxy resolve. JavaScript checks for `.then` to identify thenables.
  Object.defineProperty(proxyRef, 'then', {
    value: terminalThen,
    enumerable: false,
    configurable: true,
  });

  return proxyRef;
}

/** Возвращает все аргументы, переданные в .where() за всё время вызовов mock'а. */
export function whereArgsOf(db: MockDb): SQL[] {
  return db.calls
    .filter((c) => c.method === 'where')
    .map((c) => c.args[0] as SQL);
}
