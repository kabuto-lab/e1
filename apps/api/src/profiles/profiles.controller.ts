/**
 * Profiles Controller
 * HTTP endpoints for model profile management
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto, UpdateProfileDto, PublishProfileDto } from './dto/create-profile.dto';
import {
  GeneratePresignedUrlDto,
  ConfirmUploadDto,
  ModerateMediaDto,
  AssignMediaToModelDto,
} from './dto/media.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';

@ApiTags('Profiles')
@ApiBearerAuth()
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  // ============================================
  // PROFILE CRUD
  // ============================================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create new model profile' })
  @ApiResponse({ status: 201, description: 'Profile created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
  async createProfile(
    @Request() req: any,
    @Body() createProfileDto: CreateProfileDto,
  ) {
    const userId = req.user?.userId;
    return this.profilesService.createProfile(userId, createProfileDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my profile' })
  async getMyProfile(@Request() req: any) {
    const userId = req.user?.userId;
    const profile = await this.profilesService.findByUserId(userId);

    if (!profile) {
      return { message: 'Profile not found', profile: null };
    }

    return profile;
  }

  /** До @Get(':id'), иначе часть стеков матчит «models» как :id и ломает медиа-лист. */
  @Get('models/:modelId/media')
  @ApiOperation({ summary: 'Get profile media files' })
  async getProfileMedia(@Param('modelId', ParseUUIDPipe) modelId: string) {
    return this.profilesService.getProfileMedia(modelId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get profile by ID' })
  async getProfile(@Param('id', ParseUUIDPipe) id: string) {
    const profile = await this.profilesService.findById(id);

    if (!profile) {
      return { message: 'Profile not found', profile: null };
    }

    return profile;
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get profile by slug (public)' })
  async getProfileBySlug(@Param('slug') slug: string) {
    const profile = await this.profilesService.findBySlug(slug);

    if (!profile) {
      return { message: 'Profile not found', profile: null };
    }

    return profile;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get catalog (admin - includes unpublished)' })
  async getCatalog(
    @Query('availabilityStatus') availabilityStatus?: string,
    @Query('eliteStatus') eliteStatus?: boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('orderBy') orderBy?: 'rating' | 'createdAt' | 'displayName',
    @Query('order') order?: 'asc' | 'desc',
    @Query('includeUnpublished') includeUnpublished?: string,
  ) {
    return this.profilesService.getCatalog({
      availabilityStatus,
      eliteStatus,
      limit: limit || 50,
      offset: offset || 0,
      orderBy,
      order,
      includeUnpublished: includeUnpublished === 'true',
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update profile' })
  async updateProfile(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    await this.profilesService.verifyOwnership(id, req.user?.userId, req.user?.role);
    return this.profilesService.updateProfile(id, updateProfileDto);
  }

  @Put(':id/publish')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish/unpublish profile' })
  async togglePublication(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() publishDto: PublishProfileDto,
  ) {
    await this.profilesService.verifyOwnership(id, req.user?.userId, req.user?.role);
    return this.profilesService.togglePublication(id, publishDto.isPublished);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete profile' })
  async deleteProfile(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.profilesService.verifyOwnership(id, req.user?.userId, req.user?.role);
    await this.profilesService.deleteProfile(id);
  }

  // ============================================
  // MEDIA MANAGEMENT
  // ============================================

  @Get('media/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all media for current user' })
  async getMyMedia(@Request() req: any) {
    return this.profilesService.getMediaByOwner(req.user?.userId, req.user?.role);
  }

  @Post('media/presigned')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate presigned URL for upload' })
  @ApiResponse({ status: 201, description: 'Presigned URL generated' })
  async generatePresignedUrl(
    @Request() req: any,
    @Body() generatePresignedUrlDto: GeneratePresignedUrlDto,
  ) {
    const userId = req.user?.userId;

    return this.profilesService.generatePresignedUrl(
      userId,
      generatePresignedUrlDto.fileName,
      generatePresignedUrlDto.mimeType,
      generatePresignedUrlDto.fileSize,
      generatePresignedUrlDto.modelId,
    );
  }

  @Post('media/:id/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Confirm media upload' })
  async confirmUpload(
    @Param('id') mediaId: string,
    @Body() confirmUploadDto: ConfirmUploadDto,
  ) {
    return this.profilesService.confirmUpload(mediaId, confirmUploadDto);
  }

  @Put('media/:id/set-main')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Set main photo for profile' })
  async setMainPhoto(
    @Param('id') mediaId: string,
    @Query('modelId', ParseUUIDPipe) modelId: string,
  ) {
    return this.profilesService.setMainPhoto(modelId, mediaId);
  }

  @Put('media/:id/assign-to-model')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Attach existing media to model profile (media library)' })
  async assignMediaToModel(
    @Request() req: any,
    @Param('id') mediaId: string,
    @Body() body: AssignMediaToModelDto,
  ) {
    return this.profilesService.assignMediaToModel(
      mediaId,
      body.modelId,
      body.sortOrder,
      req.user?.userId,
      req.user?.role,
    );
  }

  @Put('media/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Approve media (moderation)' })
  async approveMedia(@Request() req: any, @Param('id') mediaId: string) {
    const moderatedBy = req.user?.userId;
    return this.profilesService.approveMedia(mediaId, moderatedBy);
  }

  @Put('media/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Reject media (moderation)' })
  async rejectMedia(
    @Request() req: any,
    @Param('id') mediaId: string,
    @Body() moderateMediaDto: ModerateMediaDto,
  ) {
    const moderatedBy = req.user?.userId;
    return this.profilesService.rejectMedia(
      mediaId,
      moderateMediaDto.moderationReason || 'Content violates guidelines',
      moderatedBy,
    );
  }

  @Delete('media/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete media file' })
  async deleteMedia(@Param('id') mediaId: string) {
    await this.profilesService.deleteMedia(mediaId);
    return { message: 'Media deleted successfully' };
  }

  // ============================================
  // STATS
  // ============================================

  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get profiles statistics' })
  async getStats() {
    return this.profilesService.getStats();
  }
}
