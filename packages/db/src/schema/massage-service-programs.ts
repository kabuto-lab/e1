import { pgTable, uuid, varchar, decimal, integer, timestamp, index, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { massageMasters } from './massage-masters';

/** Программы/пакеты услуг мастера в массажном режиме. */
export const massageServicePrograms = pgTable(
  'massage_service_programs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    masterId: uuid('master_id').notNull().references(() => massageMasters.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    description: text('description'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    durationMinutes: integer('duration_minutes'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    masterIdx: index('massage_program_master_idx').on(table.masterId),
  }),
);

export const massageServiceProgramsRelations = relations(massageServicePrograms, ({ one }) => ({
  master: one(massageMasters, {
    fields: [massageServicePrograms.masterId],
    references: [massageMasters.id],
  }),
}));

export type MassageServiceProgram = typeof massageServicePrograms.$inferSelect;
export type NewMassageServiceProgram = typeof massageServicePrograms.$inferInsert;
