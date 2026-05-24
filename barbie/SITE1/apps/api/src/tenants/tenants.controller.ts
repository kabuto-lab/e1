/**
 * /v1/platform/tenants — cross-tenant управление, только platform-admin.
 *
 * @SkipTenant() — эти эндпоинты не должны требовать tenant context
 *                 (поскольку они САМИ управляют тенантами).
 * @RequireRole('platform-admin', 'platform-support') — RolesGuard проверяет JWT.
 */
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';

import { SkipTenant } from '../tenant-context/tenant.decorator';
import { RequireRole } from '../common/decorators/require-role.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { TenantsService } from './tenants.service';
import { WpImportService } from './wp-import.service';
import { WpJobStore, type WpImportEvent } from './wp-job-store';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { ListTenantsQueryDto } from './dto/list-tenants-query.dto';
import {
  ListTenantsResponseDto,
  TenantResponseDto,
  TenantWithAdminDto,
} from './dto/tenant-response.dto';
import {
  BootstrapTenantDto,
  BootstrapTenantResultDto,
} from './dto/bootstrap-tenant.dto';
import {
  BootstrapWpDto,
  BootstrapWpKickoffDto,
} from './dto/bootstrap-wp.dto';
import {
  UpdateDesignTokensDto,
  DesignTokensResponseDto,
} from './dto/update-design-tokens.dto';

@ApiTags('platform · tenants')
@ApiBearerAuth()
@SkipTenant()
@UseGuards(RolesGuard)
@Controller({ path: 'platform/tenants', version: '1' })
export class TenantsController {
  constructor(
    private readonly service: TenantsService,
    private readonly wpImport: WpImportService,
    private readonly wpJobs: WpJobStore,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @RequireRole('platform-admin')
  @ApiOperation({ summary: 'Создать тенант + первого tenant-admin (одной транзакцией)' })
  create(@Body() dto: CreateTenantDto): Promise<TenantWithAdminDto> {
    return this.service.createTenant(dto);
  }

  @Post('bootstrap')
  @RequireRole('platform-admin')
  @ApiOperation({
    summary: 'Bootstrap тенант из URL: создать с готовыми design tokens + menu items + favicon',
    description:
      'Принимает payload из site-analyzer wizard. Атомарно вставляет tenants + tenant_design_tokens + tenant_menu_items. ' +
      'Если указан faviconUrl — сервер скачает (SSRF-protected) и положит в media + tenant_design_tokens.faviconKey. ' +
      'Тенант создаётся БЕЗ admin user — добавь его отдельным вызовом POST /platform/tenants или POST /tenant-users.',
  })
  bootstrap(@Body() dto: BootstrapTenantDto): Promise<BootstrapTenantResultDto> {
    return this.service.bootstrap(dto);
  }

  @Post('bootstrap-wp')
  @RequireRole('platform-admin')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Bootstrap тенант из WordPress-донора (async, прогресс по SSE).',
    description:
      'Импорт идёт минутами: возвращает jobId, реальная работа в фоне. Подпишись на ' +
      'GET /platform/tenants/bootstrap-wp/:jobId/stream чтобы получать события ' +
      '(tenant.created, page.imported, media.imported, …, done | error).',
  })
  bootstrapWp(@Body() dto: BootstrapWpDto): BootstrapWpKickoffDto {
    const jobId = this.wpJobs.createJob();
    // Fire-and-forget — never throw out of controller; jobStore.finalize ловит всё.
    void this.wpImport.run(jobId, dto);
    return { jobId };
  }

  @Get('bootstrap-wp/:jobId/stream')
  @Public() // JWT валидируем вручную по `?token=` — EventSource не шлёт headers.
  @ApiOperation({
    summary: 'SSE-стрим прогресса WP-импорта. EventSource подписывается сразу после kickoff\'а.',
    description: 'Auth: ?token=<accessToken>. Требует kind=platform, role=platform-admin.',
  })
  bootstrapWpStream(
    @Param('jobId') jobId: string,
    @Query('token') token: string | undefined,
    @Res() res: Response,
  ): void {
    if (!token) throw new UnauthorizedException({ code: 'TOKEN_REQUIRED' });
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.get<string>('jwt.secret'),
      });
    } catch {
      throw new UnauthorizedException({ code: 'TOKEN_INVALID' });
    }
    if (payload.kind !== 'platform' || payload.role !== 'platform-admin') {
      throw new ForbiddenException({ code: 'PLATFORM_ADMIN_REQUIRED' });
    }

    // Native Express SSE (не Nest @Sse): нужен ручной контроль над flushing'ом
    // и unsubscribe при close — это надёжнее RxJS bridge'а для long-lived stream'ов.
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const writeEvent = (ev: WpImportEvent) => {
      res.write(`event: ${ev.type}\n`);
      res.write(`data: ${JSON.stringify(ev)}\n\n`);
    };

    const sub = this.wpJobs.subscribe(jobId, writeEvent);
    if (!sub.ok) {
      res.write(`event: error\n`);
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: 'Unknown jobId', error: { code: 'JOB_NOT_FOUND' } })}\n\n`,
      );
      res.end();
      return;
    }

    // Heartbeat — раз в 25s, чтобы reverse-proxy не закрывал idle-соединение.
    const heartbeat = setInterval(() => {
      res.write(`: ping ${Date.now()}\n\n`);
    }, 25_000);

    res.on('close', () => {
      clearInterval(heartbeat);
      sub.unsubscribe();
    });
  }

  @Get()
  @RequireRole('platform-admin', 'platform-support')
  @ApiOperation({ summary: 'Список тенантов с фильтрами/пагинацией' })
  list(@Query() query: ListTenantsQueryDto): Promise<ListTenantsResponseDto> {
    return this.service.listTenants(query);
  }

  @Get(':id')
  @RequireRole('platform-admin', 'platform-support')
  @ApiOperation({ summary: 'Детали тенанта по id' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<TenantResponseDto> {
    return this.service.getTenant(id);
  }

  @Patch(':id')
  @RequireRole('platform-admin')
  @ApiOperation({ summary: 'Обновить name / status / primaryDomain' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.service.updateTenant(id, dto);
  }

  @Delete(':id')
  @RequireRole('platform-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-archive (status=archived). Физического удаления нет.' })
  archive(@Param('id', new ParseUUIDPipe()) id: string): Promise<TenantResponseDto> {
    return this.service.archiveTenant(id);
  }

  // ─── Design tokens ──────────────────────────────────────────────────────────
  // Слаговый адрес (а не uuid) — /admin/projects работает со slug'ами, не id'шниками.

  @Get(':slug/design-tokens')
  @RequireRole('platform-admin', 'platform-support')
  @ApiOperation({ summary: 'Дизайн-токены тенанта по slug (для admin-редактора)' })
  getDesignTokens(@Param('slug') slug: string): Promise<DesignTokensResponseDto> {
    return this.service.getDesignTokensBySlug(slug);
  }

  @Patch(':slug/design-tokens')
  @RequireRole('platform-admin')
  @ApiOperation({
    summary: 'Patch дизайн-токены (только присланные поля). Закрывает /admin/projects → API.',
  })
  patchDesignTokens(
    @Param('slug') slug: string,
    @Body() dto: UpdateDesignTokensDto,
  ): Promise<DesignTokensResponseDto> {
    return this.service.updateDesignTokensBySlug(slug, dto);
  }
}
