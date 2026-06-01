/**
 * EmployeesService — управление сотрудниками тенанта (tenant_users): список с
 * именем/почтой (join users) и правка прав (`permissions` jsonb) / роли /
 * статуса. Tenant-scoped через TenantContextService. Управляет только
 * tenant-admin (см. контроллер).
 */
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';

import type { Database } from '@barbie-site1/db';
import { tenantUsers, users } from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import type { EmployeeDto } from './dto/employee-response.dto';
import type { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tenantCtx: TenantContextService,
  ) {}

  async list(): Promise<EmployeeDto[]> {
    const tenantId = this.tenantCtx.requireTenantId();
    const rows = await this.db
      .select({
        id: tenantUsers.id,
        userId: tenantUsers.userId,
        name: users.name,
        email: users.email,
        role: tenantUsers.role,
        status: tenantUsers.status,
        permissions: tenantUsers.permissions,
      })
      .from(tenantUsers)
      .innerJoin(users, eq(users.id, tenantUsers.userId))
      .where(eq(tenantUsers.tenantId, tenantId))
      .orderBy(asc(users.name));
    return rows.map((r) => ({ ...r }));
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<EmployeeDto> {
    const tenantId = this.tenantCtx.requireTenantId();

    const patch: Record<string, unknown> = { updatedAt: sql`now()` };
    if (dto.permissions !== undefined) patch.permissions = dto.permissions;
    if (dto.role !== undefined) patch.role = dto.role;
    if (dto.status !== undefined) patch.status = dto.status;

    const [row] = await this.db
      .update(tenantUsers)
      .set(patch)
      .where(and(eq(tenantUsers.id, id), eq(tenantUsers.tenantId, tenantId)))
      .returning({ userId: tenantUsers.userId });
    if (!row) throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND', id });

    const [full] = await this.db
      .select({
        id: tenantUsers.id,
        userId: tenantUsers.userId,
        name: users.name,
        email: users.email,
        role: tenantUsers.role,
        status: tenantUsers.status,
        permissions: tenantUsers.permissions,
      })
      .from(tenantUsers)
      .innerJoin(users, eq(users.id, tenantUsers.userId))
      .where(eq(tenantUsers.id, id))
      .limit(1);
    return { ...full };
  }
}
