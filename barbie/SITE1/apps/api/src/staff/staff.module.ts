/**
 * StaffModule — tenant-scoped CRUD над `staff` + M2M `staff_services`.
 *
 * Зависимости:
 *   - DatabaseModule (@Global) — DRIZZLE provider
 *   - TenantContextModule (@Global) — TenantContextService, TenantGuard
 *
 * Регистрация в app.module.ts остаётся на усмотрение пользователя
 * (по правилу — модуль импортируется в AppModule.imports).
 */
import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
