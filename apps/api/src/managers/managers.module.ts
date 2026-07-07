import { Module } from '@nestjs/common';
import { ManagersService } from './managers.service';
import { ManagersController, AdminManagersController } from './managers.controller';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';

@Module({
  imports: [AuthGuardsModule],
  providers: [ManagersService],
  controllers: [ManagersController, AdminManagersController],
  exports: [ManagersService],
})
export class ManagersModule {}
