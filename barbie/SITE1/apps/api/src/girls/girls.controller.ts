/**
 * /v1/girls — управление глобальным каталогом моделей (Class-G).
 *
 * Глобальный ресурс (без tenant-контекста). Защищён глобальным JwtAuthGuard
 * (любой аутентифицированный админ). Ужесточение до platform-admin —
 * fast-follow (ADR-008: каталог правит platform-admin).
 *
 * MVP: list / get / update (правка данных карточки + порядок/видимость фото).
 */
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SkipTenant } from '../tenant-context/tenant.decorator';
import { GirlsService } from './girls.service';
import { UpdateGirlDto } from './dto/update-girl.dto';
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
