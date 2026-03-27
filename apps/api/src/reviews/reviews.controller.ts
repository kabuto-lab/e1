/**
 * Reviews Controller - endpoints для отзывов
 */

import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class CreateReviewDto {
  bookingId: string;
  modelId: string;
  rating: number;
  comment?: string;
  isAnonymous?: boolean;
}

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Статистика отзывов' })
  async getStats() {
    return this.reviewsService.getStats();
  }

  @Get('model/:modelId')
  @ApiOperation({ summary: 'Отзывы модели' })
  async getByModel(@Param('modelId') modelId: string, @Query('limit') limit?: string) {
    return this.reviewsService.findByModel(modelId, limit ? parseInt(limit) : 20);
  }

  @Get('model/:modelId/rating')
  @ApiOperation({ summary: 'Рейтинг модели' })
  async getModelRating(@Param('modelId') modelId: string) {
    return this.reviewsService.getModelRating(modelId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отзыв по ID' })
  async getById(@Param('id') id: string) {
    return this.reviewsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать отзыв' })
  async create(@Body() body: CreateReviewDto, @Request() req) {
    return this.reviewsService.createReview({
      ...body,
      clientId: req.user.userId,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить отзыв' })
  async delete(@Param('id') id: string) {
    return this.reviewsService.delete(id);
  }
}
