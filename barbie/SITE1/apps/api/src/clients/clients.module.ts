import { Module } from '@nestjs/common';

import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

/**
 * ClientsModule — CRM-карточки клиентов салона (tenant-scoped CRUD).
 *
 * ClientsService экспортируется наружу: AppointmentsModule использует
 * findByPhone() при создании booking (auto-link существующей карточки или
 * создание новой).
 */
@Module({
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
