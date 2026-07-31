import { pgTable, uuid, varchar, timestamp, index, text } from 'drizzle-orm/pg-core';

/**
 * Заявки «Запросить доступ» при закрытом каталоге массажного режима — без привязки к мастеру.
 */
export const massageAccessRequests = pgTable(
  'massage_access_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    contact: varchar('contact', { length: 100 }).notNull(),
    comment: text('comment'),
    status: varchar('status', { length: 20 })
      .$type<'new' | 'contacted' | 'done' | 'cancelled'>()
      .default('new')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index('massage_access_request_status_idx').on(table.status),
  }),
);

export type MassageAccessRequest = typeof massageAccessRequests.$inferSelect;
export type NewMassageAccessRequest = typeof massageAccessRequests.$inferInsert;
