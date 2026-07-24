/**
 * Модерация — очередь и решения (admin / manager).
 */

import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';
import { ModerationService } from './moderation.service';

class PatchVerificationDto {
  @IsEnum(['verified', 'rejected'])
  verificationStatus!: 'verified' | 'rejected';
}

class PatchReviewModerationDto {
  @IsEnum(['approved', 'rejected'])
  moderationStatus!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  moderationReason?: string;
}

class PatchReviewComplaintDto {
  @IsEnum(['dismissed', 'redacted', 'deleted'])
  resolution!: 'dismissed' | 'redacted' | 'deleted';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  redactedComment?: string;
}

@ApiTags('Moderation')
@ApiBearerAuth()
/** Под `models/moderation/*`, чтобы маршрут всегда поднимался с ModelsModule и не терялся отдельным модулем. */
@Controller('models/moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('queue')
  @Roles(Role.ADMIN, Role.MANAGER, Role.MODERATOR)
  @ApiOperation({ summary: 'Очередь: анкеты (верификация), медиа, отзывы' })
  async getQueue(@Request() req: { user: { userId: string; role: string } }) {
    const u = req.user;
    return this.moderationService.getQueue(u.role, u.userId);
  }

  @Patch('profiles/:id/verification')
  @Roles(Role.ADMIN, Role.MANAGER, Role.MODERATOR)
  @ApiOperation({ summary: 'Верификация анкеты: одобрить / отклонить' })
  async patchProfileVerification(
    @Param('id') id: string,
    @Body() body: PatchVerificationDto,
    @Request() req: { user: { userId: string; role: string } },
  ) {
    const u = req.user;
    return this.moderationService.setProfileVerification(id, body.verificationStatus, u.role, u.userId);
  }

  @Patch('reviews/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.MODERATOR)
  @ApiOperation({ summary: 'Модерация отзыва' })
  async patchReview(
    @Param('id') id: string,
    @Body() body: PatchReviewModerationDto,
    @Request() req: { user: { userId: string; role: string } },
  ) {
    const u = req.user;
    return this.moderationService.setReviewModeration(
      id,
      body.moderationStatus,
      body.moderationReason,
      u.role,
      u.userId,
    );
  }

  @Patch('reviews/:id/complaint')
  @Roles(Role.ADMIN, Role.MANAGER, Role.MODERATOR)
  @ApiOperation({ summary: 'Разрешить жалобу модели на отзыв' })
  async patchReviewComplaint(
    @Param('id') id: string,
    @Body() body: PatchReviewComplaintDto,
    @Request() req: { user: { userId: string; role: string } },
  ) {
    const u = req.user;
    return this.moderationService.resolveReviewComplaint(id, body.resolution, body.redactedComment, u.role, u.userId);
  }
}
