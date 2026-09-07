import { ForbiddenException, Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { employeeProfiles, users } from '@escort/db';
import { UsersService } from '../users/users.service';

export interface EmployeeRow {
  id: string;
  userId: string;
  login: string | null;
  fullName: string | null;
  initialPassword: string | null;
  canManagePayouts: boolean;
  canEditModels: boolean;
  createdAt: Date;
}

export interface EmployeeAccess {
  managerId: string;
  canManagePayouts: boolean;
  canEditModels: boolean;
}

/**
 * Сотрудники менеджера (роль Employee) — фиксированный набор возможностей
 * (чаты, статусы и расписание анкет своего менеджера), см. ТЗ MyMuse.
 * Аккаунт и привязку к себе создаёт сам менеджер.
 */
@Injectable()
export class EmployeesService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
    private readonly usersService: UsersService,
  ) {}

  async createEmployee(
    managerId: string,
    dto: { login: string; password: string; fullName?: string },
  ): Promise<EmployeeRow> {
    const user = await this.usersService.createUser({
      login: dto.login,
      password: dto.password,
      role: 'employee',
      fullName: dto.fullName,
      // Сотрудник не сам придумывал пароль (его задал менеджер) — сохраняем plaintext,
      // чтобы менеджер мог посмотреть его повторно и передать сотруднику (см. поле
      // users.initialPassword — тот же приём, что и для моделей, созданных менеджером).
      storeInitialPasswordPlaintext: true,
    });

    await this.db.insert(employeeProfiles).values({ userId: user.id, managerId });

    return {
      id: user.id,
      userId: user.id,
      login: user.login,
      fullName: user.fullName,
      initialPassword: user.initialPassword,
      canManagePayouts: false,
      canEditModels: false,
      createdAt: user.createdAt,
    };
  }

  async listEmployees(managerId: string): Promise<EmployeeRow[]> {
    const rows = await this.db
      .select({
        userId: employeeProfiles.userId,
        login: users.login,
        fullName: users.fullName,
        initialPassword: users.initialPassword,
        canManagePayouts: employeeProfiles.canManagePayouts,
        canEditModels: employeeProfiles.canEditModels,
        createdAt: employeeProfiles.createdAt,
      })
      .from(employeeProfiles)
      .innerJoin(users, eq(users.id, employeeProfiles.userId))
      .where(eq(employeeProfiles.managerId, managerId));

    return rows.map((r: any) => ({
      id: r.userId,
      userId: r.userId,
      login: r.login,
      fullName: r.fullName,
      initialPassword: r.initialPassword,
      canManagePayouts: r.canManagePayouts,
      canEditModels: r.canEditModels,
      createdAt: r.createdAt,
    }));
  }

  async deleteEmployee(managerId: string, employeeUserId: string): Promise<void> {
    const [row] = await this.db
      .select({ managerId: employeeProfiles.managerId })
      .from(employeeProfiles)
      .where(eq(employeeProfiles.userId, employeeUserId))
      .limit(1);

    if (!row || row.managerId !== managerId) {
      throw new ForbiddenException('Not your employee');
    }

    await this.usersService.deleteUser(employeeUserId);
  }

  /** Менеджер настраивает доп. права своего сотрудника (выплаты/редактирование анкет). */
  async updatePermissions(
    managerId: string,
    employeeUserId: string,
    patch: Partial<Pick<EmployeeAccess, 'canManagePayouts' | 'canEditModels'>>,
  ): Promise<EmployeeRow> {
    const [row] = await this.db
      .select({ managerId: employeeProfiles.managerId })
      .from(employeeProfiles)
      .where(eq(employeeProfiles.userId, employeeUserId))
      .limit(1);
    if (!row || row.managerId !== managerId) {
      throw new ForbiddenException('Not your employee');
    }

    await this.db.update(employeeProfiles).set(patch).where(eq(employeeProfiles.userId, employeeUserId));

    const [updated] = await this.listEmployees(managerId).then((rows) => rows.filter((r) => r.userId === employeeUserId));
    return updated;
  }

  /** Права и managerId сотрудника — для scope-проверок в payouts/models. Null, если не сотрудник ни у кого. */
  async getAccess(userId: string): Promise<EmployeeAccess | null> {
    const [row] = await this.db
      .select({
        managerId: employeeProfiles.managerId,
        canManagePayouts: employeeProfiles.canManagePayouts,
        canEditModels: employeeProfiles.canEditModels,
      })
      .from(employeeProfiles)
      .where(eq(employeeProfiles.userId, userId))
      .limit(1);
    return row ?? null;
  }
}
