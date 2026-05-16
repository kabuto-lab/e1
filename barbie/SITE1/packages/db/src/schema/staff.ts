/**
 * Staff — мастера (исполнители услуг).
 *
 * Привязан к одному салону (`salon_id NOT NULL`). Опционально связан с
 * `users.id` (мастер может быть приглашён, но ещё не зарегистрирован — тогда
 * `user_id IS NULL`).
 *
 * `specialties` хранится как jsonb-array строк (категорий услуг) — упрощает
 * фильтрацию без второй M2M таблицы. `schedule` — недельный recurring график
 * мастера + exceptions.
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.9.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { salons } from './salons';
import { users } from './users';

export type StaffStatus = 'active' | 'on_leave' | 'archived';

export type StaffScheduleSlot = { from: string; to: string };
export type StaffSchedule = {
  weekly: Record<
    'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
    StaffScheduleSlot[] | null
  >;
  exceptions?: Array<{ date: string; slots: StaffScheduleSlot[] | null }>;
};

export const staff = pgTable(
  'staff',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    salonId: uuid('salon_id')
      .references(() => salons.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    name: varchar('name', { length: 255 }).notNull(),
    bio: text('bio'),
    photoKey: varchar('photo_key', { length: 500 }),

    specialties: jsonb('specialties')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    schedule: jsonb('schedule').$type<StaffSchedule>().notNull(),

    status: varchar('status', { length: 20 })
      .$type<StaffStatus>()
      .notNull()
      .default('active'),

    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantSalonStatusIdx: index('staff_tenant_salon_status_idx').on(
      t.tenantId,
      t.salonId,
      t.status,
    ),
    userIdx: index('staff_user_idx').on(t.userId),
  }),
);

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
