/**
 * /v1/chat — message CRUD endpoints.
 *
 * Routes:
 *  GET    /v1/chat/channels/:channelId/messages?before&limit
 *  POST   /v1/chat/channels/:channelId/messages
 *  PATCH  /v1/chat/messages/:messageId
 *  DELETE /v1/chat/messages/:messageId
 *
 * Channel-scoped routes идут через ChannelMemberGuard; author-only routes
 * (edit/delete) проверяются в сервисе по `authorUserId`.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { TenantGuard } from '../tenant-context/tenant.guard';
import { RequireRole } from '../common/decorators/require-role.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';

import { MessagesService } from './messages.service';
import { ChannelMemberGuard } from './guards/channel-member.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { MessageResponseDto } from './dto/message-response.dto';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller({ version: '1' })
export class ChatMessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get('chat/channels/:channelId/messages')
  @UseGuards(ChannelMemberGuard)
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({ summary: 'List messages (newest first, paginated by `before` cursor)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Query() query: ListMessagesQueryDto,
  ): Promise<MessageResponseDto[]> {
    return this.service.list(user, channelId, query);
  }

  @Post('chat/channels/:channelId/messages')
  @UseGuards(ChannelMemberGuard)
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({ summary: 'Post a message' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Body() dto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    return this.service.create(user, channelId, dto);
  }

  @Patch('chat/messages/:messageId')
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({ summary: 'Edit own message (sets edited_at)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Body() dto: UpdateMessageDto,
  ): Promise<MessageResponseDto> {
    return this.service.update(user, messageId, dto);
  }

  @Delete('chat/messages/:messageId')
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete own message (body cleared, row kept)' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
  ): Promise<{ deleted: true }> {
    return this.service.remove(user, messageId);
  }
}
