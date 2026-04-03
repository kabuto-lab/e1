import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { ContactMessageDto } from './dto/contact-message.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('message')
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @ApiOperation({ summary: 'Отправить сообщение с формы «Контакты»' })
  @ApiResponse({ status: 201, description: 'Сообщение принято и отправлено на почту' })
  @ApiResponse({ status: 400, description: 'Ошибка валидации' })
  @ApiResponse({ status: 429, description: 'Слишком много запросов' })
  @ApiResponse({ status: 503, description: 'SMTP не настроен' })
  async sendMessage(@Body() body: ContactMessageDto) {
    await this.contactService.sendContactMessage(body);
    return { ok: true };
  }
}
