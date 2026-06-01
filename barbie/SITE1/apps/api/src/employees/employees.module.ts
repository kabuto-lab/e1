/**
 * EmployeesModule — управление сотрудниками тенанта (tenant_users + permissions).
 * Регистрируется через TenantsModule (imports), чтобы не трогать spine
 * app.module.ts. DRIZZLE глобален (DatabaseModule).
 */
import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
