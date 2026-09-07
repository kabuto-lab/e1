import { pgTable, uuid, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/**
 * Сотрудник менеджера (роль Employee) — «40 анкет → 1 менеджер → несколько
 * сотрудников» (см. ТЗ MyMuse). Базовый набор (чаты, статусы, расписание —
 * включая подтверждение/отклонение/перенос брони) доступен всегда; два флага
 * ниже — дополнительные права, которые менеджер включает по своему усмотрению,
 * ровно в рамках того, что может он сам по своим анкетам (см. EmployeesService,
 * PayoutsService/ModelsController — везде scoped по managerId). Верификацию
 * анкет сотрудникам не делегируем — этим занимаются Admin/Moderator.
 * Аккаунт создаёт сам менеджер.
 */
export const employeeProfiles = pgTable(
  'employee_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    managerId: uuid('manager_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    /** Заявки на выплату своих моделей — просмотр + одобрить/отклонить/отметить выплаченной. */
    canManagePayouts: boolean('can_manage_payouts').default(false).notNull(),
    /** Полное редактирование анкеты (био/расценки/контакты/публикация), не только статус. */
    canEditModels: boolean('can_edit_models').default(false).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: uniqueIndex('employee_profiles_user_id_unique').on(table.userId),
    managerIdx: index('employee_profiles_manager_id_idx').on(table.managerId),
  }),
);

export const employeeProfilesRelations = relations(employeeProfiles, ({ one }) => ({
  user: one(users, { fields: [employeeProfiles.userId], references: [users.id] }),
  manager: one(users, {
    fields: [employeeProfiles.managerId],
    references: [users.id],
    relationName: 'employee_manager',
  }),
}));

export type EmployeeProfile = typeof employeeProfiles.$inferSelect;
export type NewEmployeeProfile = typeof employeeProfiles.$inferInsert;
