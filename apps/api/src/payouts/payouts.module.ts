import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { EmployeesModule } from '../employees/employees.module';
import { EscrowModule } from '../escrow/escrow.module';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';

@Module({
  imports: [AuthGuardsModule, EmployeesModule, EscrowModule],
  providers: [PayoutsService],
  controllers: [PayoutsController],
  exports: [PayoutsService],
})
export class PayoutsModule {}
