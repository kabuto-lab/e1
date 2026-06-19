import { Module } from '@nestjs/common';

import { MailService } from './mail.service';

/**
 * MailModule — переиспользуемая отправка писем (SMTP/nodemailer).
 * ConfigModule глобальный, поэтому отдельно импортировать не нужно.
 */
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
