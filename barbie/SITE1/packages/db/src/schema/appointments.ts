/**
 * Appointments — записи клиентов на услугу. Ключевая таблица операционки.
 *
 * Поведение:
 *  - `ends_at` вычисляется триггером `set_appointments_ends_at()` (§3.2) из
 *    `starts_at + duration_min`. В DDL поле NOT NULL — триггер заполняет
 *    при INSERT/UPDATE.
 *  - `idempotency_key` partial unique по `(tenant_id, idempotency_key)`
 *    защищает от дублей при retry POST /appointments.
 *  - FK на salon/client/staff/service используют `onDelete: 'restrict'` —
 *    нельзя удалить сущность, на которую есть запись (только архивировать).
 *  - Overlap-protection (exclude constraint на `staff_id`+`tsrange`) — Phase 1.
 *
 * Composite indices оптимизируют hot paths:
 *  - `(tenant_id, salon_id, starts_at)` — расписание салона.
 *  - `(staff_id, starts_at)` — расписание мастера.
 *  - `(client_id, starts_at)` — история клиента.
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.12.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { salons } from './salons';
import { clients } from './clients';
import { staff } from './staff';
import { services } from './services';

export type AppointmentStatus =
  | 'booked'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'noshow';

export type AppointmentSource = 'web' | 'admin' | 'tg' | 'phone' | 'walk-in';

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    salonId: uuid('salon_id')
      .references(() => salons.id, { onDelete: 'restrict' })
      .notNull(),

    clientId: uuid('client_id')
      .references(() => clients.id, { onDelete: 'restrict' })
      .notNull(),
    staffId: uuid('staff_id')
      .references(() => staff.id, { onDelete: 'restrict' })
      .notNull(),
    serviceId: uuid('service_id')
      .references(() => services.id, { onDelete: 'restrict' })
      .notNull(),

    startsAt: timestamp('starts_at').notNull(),
    durationMin: integer('duration_min').notNull(),
    /** Триггер set_appointments_ends_at() заполняет автоматически (§3.2). */
    endsAt: timestamp('ends_at').notNull(),

    priceKopecks: bigint('price_kopecks', { mode: 'bigint' }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('RUB'),

    status: varchar('status', { length: 20 })
      .$type<AppointmentStatus>()
      .notNull()
      .default('booked'),

    source: varchar('source', { length: 16 })
      .$type<AppointmentSource>()
      .notNull()
      .default('web'),

    notes: text('notes'),
    cancellationReason: text('cancellation_reason'),

    idempotencyKey: varchar('idempotency_key', { length: 128 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantStartsIdx: index('appointments_tenant_starts_idx').on(t.tenantId, t.startsAt),
    tenantSalonStartsIdx: index('appointments_tenant_salon_starts_idx').on(
      t.tenantId,
      t.salonId,
      t.startsAt,
    ),
    staffStartsIdx: index('appointments_staff_starts_idx').on(t.staffId, t.startsAt),
    clientStartsIdx: index('appointments_client_starts_idx').on(t.clientId, t.startsAt),
    tenantStatusIdx: index('appointments_tenant_status_idx').on(t.tenantId, t.status),
    idempotencyUniq: uniqueIndex('appointments_idempotency_uniq')
      .on(t.tenantId, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
    durationCheck: check(
      'appointments_duration_check',
      sql`duration_min > 0 AND duration_min <= 1440`,
    ),
    timeOrderCheck: check(
      'appointments_time_order_check',
      sql`ends_at > starts_at`,
    ),
    priceCheck: check('appointments_price_check', sql`price_kopecks >= 0`),
  }),
);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
