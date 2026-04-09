/**
 * Reviews Controller — JWT обязателен для просмотра по модели; клиентские отзывы только с ролью client
 */

import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';

class CreateReviewDto {
  @IsUUID()
  bookingId: string;

  @IsUUID()
  modelId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

class CreateStaffReviewDto {
  @IsUUID()
  modelId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Статистика отзывов (только admin)' })
  async getStats() {
    return this.reviewsService.getStats();
  }

  @Get('model/:modelId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отзывы модели (доступ по роли и подписке)' })
  async getByModel(
    @Param('modelId') modelId: string,
    @Query('limit') limit: string | undefined,
    @Request() req: { user: { userId: string; role: string } },
  ) {
    return this.reviewsService.getReviewsForViewer(
      modelId,
      limit ? parseInt(limit, 10) : 50,
      req.user.userId,
      req.user.role,
    );
  }

  @Get('model/:modelId/rating')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Рейтинг модели (одобренные; те же правила доступа)' })
  async getModelRating(
    @Param('modelId') modelId: string,
    @Request() req: { user: { userId: string; role: string } },
  ) {
    return this.reviewsService.getModelRatingForViewer(modelId, req.user.userId, req.user.role);
  }

  @Get('public/model/:modelId')
  @ApiOperation({
    summary: 'Публичные одобренные отзывы (для каталога; текст только у публичных отзывов)',
  })
  async listPublicCatalog(
    @Param('modelId') modelId: string,
    @Query('limit') limit: string | undefined,
  ) {
    return this.reviewsService.listPublicCatalogReviews(modelId, limit ? parseInt(limit, 10) : 20);
  }

  @Post('staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Черновик отзыва staff → модерация' })
  async createStaff(@Body() body: CreateStaffReviewDto, @Request() req: { user: { userId: string; role: string } }) {
    return this.reviewsService.createStaffReview({
      authorUserId: req.user.userId,
      authorRole: req.user.role,
      modelId: body.modelId,
      rating: body.rating,
      comment: body.comment,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отзыв по ID (admin)' })
  async getById(@Param('id') id: string) {
    return this.reviewsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать отзыв после завершённой встречи (client)' })
  async create(@Body() body: CreateReviewDto, @Request() req: { user: { userId: string } }) {
    return this.reviewsService.createReview({
      ...body,
      clientId: req.user.userId,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить отзыв (admin)' })
  async delete(@Param('id') id: string) {
    return this.reviewsService.delete(id);
  }
}
