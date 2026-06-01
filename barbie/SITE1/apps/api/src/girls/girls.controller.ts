/**
 * /v1/girls — управление глобальным каталогом моделей (Class-G).
 *
 * Глобальный ресурс (без tenant-контекста). Защищён глобальным JwtAuthGuard
 * (любой аутентифицированный админ). Ужесточение до platform-admin —
 * fast-follow (ADR-008: каталог правит platform-admin).
 *
 * MVP: list / get / update (правка данных карточки + порядок/видимость фото).
 */
import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SkipTenant } from '../tenant-context/tenant.decorator';
import { GirlsService } from './girls.service';
import { UpdateGirlDto } from './dto/update-girl.dto';
import { ReorderGirlsDto } from './dto/reorder-girls.dto';
import { ListGirlsQueryDto } from './dto/list-girls-query.dto';
import { GirlResponseDto, ListGirlsResponseDto } from './dto/girl-response.dto';

@ApiTags('girls — global catalog')
@ApiBearerAuth()
@SkipTenant()
@Controller({ path: 'girls', version: '1' })
export class GirlsController {
  constructor(private readonly service: GirlsService) {}

  @Get()
  @ApiOperation({ summary: 'Список моделей (глобальный каталог)' })
  list(@Query() query: ListGirlsQueryDto): Promise<ListGirlsResponseDto> {
    return this.service.list(query);
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Полный ре-ордер каталога (ord по позиции). Глобально — на всех сайтах.' })
  reorder(@Body() dto: ReorderGirlsDto): Promise<{ updated: number }> {
    return this.service.reorder(dto.ids);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Модель по id' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<GirlResponseDto> {
    return this.service.get(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить карточку: имя/описание/params/порядок фото' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGirlDto,
  ): Promise<GirlResponseDto> {
    return this.service.update(id, dto);
  }
}
