/**
 * employees-api — сотрудники тенанта (tenant_users) + права. Tenant-context
 * подкладывается apiFetch (X-Tenant-Slug из сессии). Только tenant-admin.
 */
import { apiFetch } from './api-client';

export type EmployeeRole = 'tenant-admin' | 'salon-manager' | 'master' | 'client';
export type EmployeeStatus = 'active' | 'invited' | 'suspended' | 'archived';

export interface Employee {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  permissions: Record<string, boolean>;
}

export interface UpdateEmployeePayload {
  permissions?: Record<string, boolean>;
  role?: EmployeeRole;
  status?: EmployeeStatus;
}

export const employeesApi = {
  list: () => apiFetch<Employee[]>('/v1/employees'),
  update: (id: string, payload: UpdateEmployeePayload) =>
    apiFetch<Employee>(`/v1/employees/${id}`, { method: 'PATCH', body: payload }),
};

/** Каталог прав (чекбоксы). Ключи кладутся в tenant_users.permissions. */
export const PERMISSION_KEYS: { key: string; label: string }[] = [
  { key: 'models', label: 'Модели' },
  { key: 'services', label: 'Услуги' },
  { key: 'salons', label: 'Салоны' },
  { key: 'bookings', label: 'Записи' },
  { key: 'cms', label: 'Сайт' },
  { key: 'chat', label: 'Чат' },
  { key: 'employees', label: 'Сотрудники' },
  { key: 'analytics', label: 'Аналитика' },
];

export const ROLE_LABEL: Record<EmployeeRole, string> = {
  'tenant-admin': 'Админ салона',
  'salon-manager': 'Менеджер',
  master: 'Мастер',
  client: 'Клиент',
};

export const STATUS_LABEL: Record<EmployeeStatus, string> = {
  active: 'Активен',
  invited: 'Приглашён',
  suspended: 'Заморожен',
  archived: 'Архив',
};
