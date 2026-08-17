import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/guards/auth-guards.module';
import { ModelsModule } from '../models/models.module';
import { ModelStatsService } from './model-stats.service';
import { ModelStatsController } from './model-stats.controller';

@Module({
  imports: [AuthGuardsModule, ModelsModule],
  providers: [ModelStatsService],
  controllers: [ModelStatsController],
  exports: [ModelStatsService],
})
export class ModelStatsModule {}
