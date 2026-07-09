import {
  Controller, Get, Post, Param, Body, UseGuards, Request, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';

class StartConversationDto {
  @ApiProperty({ description: 'ID пользователя с которым начать диалог' })
  @IsUUID()
  targetUserId: string;
}

class SendMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;
}

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('users')
  @ApiOperation({ summary: 'Список пользователей для начала диалога' })
  getUsers(@Request() req: any) {
    return this.messagesService.getUsers(req.user.userId);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Диалоги текущего пользователя' })
  getConversations(@Request() req: any) {
    return this.messagesService.getConversations(req.user.userId);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Найти или создать диалог с пользователем' })
  async startConversation(@Request() req: any, @Body() dto: StartConversationDto) {
    const conversationId = await this.messagesService.findOrCreateConversation(
      req.user.userId,
      dto.targetUserId,
    );
    return { conversationId };
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'История сообщений диалога' })
  getMessages(
    @Request() req: any,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.getMessages(id, req.user.userId, limit ? parseInt(limit) : 50);
  }

  @Post('conversations/:id')
  @ApiOperation({ summary: 'Отправить сообщение (REST fallback)' })
  async sendMessage(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.saveMessage(id, req.user.userId, dto.content);
  }
}
