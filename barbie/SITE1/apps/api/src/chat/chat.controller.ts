/**
 * /v1/chat/channels — tenant-scoped endpoints для каналов и members.
 *
 * Доступ: staff (tenant-admin / salon-manager / master). Клиенты исключены.
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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { TenantGuard } from '../tenant-context/tenant.guard';
import { RequireRole } from '../common/decorators/require-role.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';

import { ChatService } from './chat.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ChannelResponseDto } from './dto/channel-response.dto';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller({ path: 'chat/channels', version: '1' })
export class ChatChannelsController {
  constructor(private readonly service: ChatService) {}

  @Get()
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({ summary: 'List channels the caller is a member of (excludes archived)' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<ChannelResponseDto[]> {
    return this.service.listForUser(user);
  }

  @Get('general')
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({ summary: 'Get (or lazily create) the tenant-wide staff general chat' })
  general(@CurrentUser() user: AuthenticatedUser): Promise<ChannelResponseDto> {
    return this.service.getOrCreateGeneral(user);
  }

  @Get(':channelId')
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({ summary: 'Get one channel (caller must be a member)' })
  one(
    @CurrentUser() user: AuthenticatedUser,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
  ): Promise<ChannelResponseDto> {
    return this.service.getChannelForUser(user, channelId);
  }

  @Post()
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({ summary: 'Create DM (returns existing if already present) or group' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateChannelDto,
  ): Promise<ChannelResponseDto> {
    return this.service.createChannel(user, dto);
  }

  @Patch(':channelId')
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({ summary: 'Rename / archive a group channel (admin-only)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Body() dto: UpdateChannelDto,
  ): Promise<ChannelResponseDto> {
    return this.service.updateChannel(user, channelId, dto);
  }

  @Post(':channelId/members')
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({ summary: 'Add member to a group (admin-only)' })
  addMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Body() dto: AddMemberDto,
  ): Promise<ChannelResponseDto> {
    return this.service.addMember(user, channelId, dto);
  }

  @Delete(':channelId/members/:userId')
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove member; self-leave is allowed for non-admins' })
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @Param('userId', new ParseUUIDPipe()) targetUserId: string,
  ): Promise<{ removed: true }> {
    return this.service.removeMember(user, channelId, targetUserId);
  }

  @Post(':channelId/read')
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark caller as read up to now (updates last_read_at)' })
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
  ): Promise<{ lastReadAt: string }> {
    return this.service.markRead(user, channelId);
  }
}
