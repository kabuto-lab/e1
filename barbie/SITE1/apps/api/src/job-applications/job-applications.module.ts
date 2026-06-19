import { Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module';
import { JobApplicationsController } from './job-applications.controller';
import { JobApplicationsService } from './job-applications.service';

/**
 * JobApplicationsModule — публичная форма «Хочешь работать у нас?».
 * Принимает multipart (ФИО/контакты/фото) и шлёт письмо через MailModule.
 */
@Module({
  imports: [MailModule],
  controllers: [JobApplicationsController],
  providers: [JobApplicationsService],
})
export class JobApplicationsModule {}
