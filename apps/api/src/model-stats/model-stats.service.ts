/**
 * ModelStatsService — статистика анкеты для ЛК модели: просмотры, избранное, обращения.
 *
 * Просмотры/обращения — append-only логи (model_profile_views/model_contact_events),
 * избранное считается напрямую из client_favorites (текущее состояние без истории удалений —
 * см. план: отдельный лог для этого не заводим, схема не растёт ради второстепенного блока).
 * recordView/recordContactEvent никогда не бросают — это fire-and-forget аналитика,
 * не должна ронять действие посетителя, к которому привязана.
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { and, eq, gte, count, inArray } from 'drizzle-orm';
import { modelProfileViews, modelContactEvents, clientFavorites, modelProfiles } from '@escort/db';

export type ContactChannel = 'click' | 'telegram' | 'platform';

export interface ModelStatsResponse {
  views: {
    total: number;
    last7Days: number;
    last30Days: number;
    daily: { date: string; count: number }[];
  };
  favorites: {
    current: number;
    added7Days: number;
    added30Days: number;
  };
  contacts: {
    total7Days: number;
    total30Days: number;
    byChannel: Record<ContactChannel, number>;
  };
}

export interface ManagerModelStat {
  id: string;
  displayName: string;
  slug: string | null;
  mainPhotoUrl: string | null;
  views: { total: number; last7Days: number; last30Days: number };
  favorites: { current: number; added7Days: number; added30Days: number };
  contacts: { total7Days: number; total30Days: number };
}

export interface ManagerStatsResponse {
  modelsCount: number;
  totals: {
    views: { total: number; last7Days: number; last30Days: number };
    favorites: { current: number; added7Days: number; added30Days: number };
    contacts: { total7Days: number; total30Days: number; byChannel: Record<ContactChannel, number> };
  };
  models: ManagerModelStat[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class ModelStatsService {
  private readonly logger = new Logger(ModelStatsService.name);

  constructor(@Inject('DRIZZLE') private readonly db: any) {}

  /** Дедуп по (modelId, viewerHash, viewDate) — повтор в тот же день молча игнорируется. */
  async recordView(modelId: string, ip: string): Promise<void> {
    try {
      const viewerHash = createHash('sha256').update(ip || 'unknown').digest('hex');
      await this.db
        .insert(modelProfileViews)
        .values({ modelId, viewerHash, viewDate: dateOnly(new Date()) })
        .onConflictDoNothing();
    } catch (err: any) {
      this.logger.warn(`recordView failed: ${err?.message ?? err}`);
    }
  }

  /** Не дедуплицируется намеренно — повторные клики/колебания между каналами тоже сигнал. */
  async recordContactEvent(modelId: string, channel: ContactChannel): Promise<void> {
    try {
      await this.db.insert(modelContactEvents).values({ modelId, channel });
    } catch (err: any) {
      this.logger.warn(`recordContactEvent failed: ${err?.message ?? err}`);
    }
  }

  async getStatsForModel(modelId: string): Promise<ModelStatsResponse> {
    const now = new Date();
    const from7 = dateOnly(new Date(now.getTime() - 7 * DAY_MS));
    const from30 = dateOnly(new Date(now.getTime() - 30 * DAY_MS));
    const since7 = new Date(now.getTime() - 7 * DAY_MS);
    const since30 = new Date(now.getTime() - 30 * DAY_MS);

    const [
      viewsTotalRow,
      views7Row,
      views30Row,
      dailyRows,
      favoritesCurrentRow,
      favorites7Row,
      favorites30Row,
      contacts7Row,
      contacts30Row,
      contactsByChannelRows,
    ] = await Promise.all([
      this.db.select({ value: count() }).from(modelProfileViews).where(eq(modelProfileViews.modelId, modelId)),
      this.db.select({ value: count() }).from(modelProfileViews).where(and(eq(modelProfileViews.modelId, modelId), gte(modelProfileViews.viewDate, from7))),
      this.db.select({ value: count() }).from(modelProfileViews).where(and(eq(modelProfileViews.modelId, modelId), gte(modelProfileViews.viewDate, from30))),
      this.db
        .select({ date: modelProfileViews.viewDate, value: count() })
        .from(modelProfileViews)
        .where(and(eq(modelProfileViews.modelId, modelId), gte(modelProfileViews.viewDate, from30)))
        .groupBy(modelProfileViews.viewDate),
      this.db.select({ value: count() }).from(clientFavorites).where(eq(clientFavorites.modelId, modelId)),
      this.db.select({ value: count() }).from(clientFavorites).where(and(eq(clientFavorites.modelId, modelId), gte(clientFavorites.createdAt, since7))),
      this.db.select({ value: count() }).from(clientFavorites).where(and(eq(clientFavorites.modelId, modelId), gte(clientFavorites.createdAt, since30))),
      this.db.select({ value: count() }).from(modelContactEvents).where(and(eq(modelContactEvents.modelId, modelId), gte(modelContactEvents.createdAt, since7))),
      this.db.select({ value: count() }).from(modelContactEvents).where(and(eq(modelContactEvents.modelId, modelId), gte(modelContactEvents.createdAt, since30))),
      this.db
        .select({ channel: modelContactEvents.channel, value: count() })
        .from(modelContactEvents)
        .where(and(eq(modelContactEvents.modelId, modelId), gte(modelContactEvents.createdAt, since30)))
        .groupBy(modelContactEvents.channel),
    ]);

    const dailyMap = new Map<string, number>(
      dailyRows.map((r: { date: string; value: number }) => [r.date, Number(r.value)]),
    );
    const daily: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = dateOnly(new Date(now.getTime() - i * DAY_MS));
      daily.push({ date: d, count: dailyMap.get(d) ?? 0 });
    }

    const byChannel: Record<ContactChannel, number> = { click: 0, telegram: 0, platform: 0 };
    for (const row of contactsByChannelRows as { channel: ContactChannel; value: number }[]) {
      byChannel[row.channel] = Number(row.value);
    }

    return {
      views: {
        total: Number(viewsTotalRow[0]?.value ?? 0),
        last7Days: Number(views7Row[0]?.value ?? 0),
        last30Days: Number(views30Row[0]?.value ?? 0),
        daily,
      },
      favorites: {
        current: Number(favoritesCurrentRow[0]?.value ?? 0),
        added7Days: Number(favorites7Row[0]?.value ?? 0),
        added30Days: Number(favorites30Row[0]?.value ?? 0),
      },
      contacts: {
        total7Days: Number(contacts7Row[0]?.value ?? 0),
        total30Days: Number(contacts30Row[0]?.value ?? 0),
        byChannel,
      },
    };
  }

  /** Агрегированная статистика + разбивка по анкетам для всех моделей, привязанных к менеджеру. */
  async getStatsForManager(managerId: string): Promise<ManagerStatsResponse> {
    const roster = await this.db
      .select({
        id: modelProfiles.id,
        displayName: modelProfiles.displayName,
        slug: modelProfiles.slug,
        mainPhotoUrl: modelProfiles.mainPhotoUrl,
      })
      .from(modelProfiles)
      .where(eq(modelProfiles.managerId, managerId));

    const ids: string[] = roster.map((r: { id: string }) => r.id);
    const emptyByChannel: Record<ContactChannel, number> = { click: 0, telegram: 0, platform: 0 };

    if (ids.length === 0) {
      return {
        modelsCount: 0,
        totals: {
          views: { total: 0, last7Days: 0, last30Days: 0 },
          favorites: { current: 0, added7Days: 0, added30Days: 0 },
          contacts: { total7Days: 0, total30Days: 0, byChannel: emptyByChannel },
        },
        models: [],
      };
    }

    const now = new Date();
    const from7 = dateOnly(new Date(now.getTime() - 7 * DAY_MS));
    const from30 = dateOnly(new Date(now.getTime() - 30 * DAY_MS));
    const since7 = new Date(now.getTime() - 7 * DAY_MS);
    const since30 = new Date(now.getTime() - 30 * DAY_MS);

    const byModel = (col: any) => this.db.select({ modelId: col, value: count() });

    const [
      viewsTotalRows,
      views7Rows,
      views30Rows,
      favCurrentRows,
      fav7Rows,
      fav30Rows,
      contacts7Rows,
      contacts30Rows,
      byChannelRows,
    ] = await Promise.all([
      byModel(modelProfileViews.modelId).from(modelProfileViews).where(inArray(modelProfileViews.modelId, ids)).groupBy(modelProfileViews.modelId),
      byModel(modelProfileViews.modelId).from(modelProfileViews).where(and(inArray(modelProfileViews.modelId, ids), gte(modelProfileViews.viewDate, from7))).groupBy(modelProfileViews.modelId),
      byModel(modelProfileViews.modelId).from(modelProfileViews).where(and(inArray(modelProfileViews.modelId, ids), gte(modelProfileViews.viewDate, from30))).groupBy(modelProfileViews.modelId),
      byModel(clientFavorites.modelId).from(clientFavorites).where(inArray(clientFavorites.modelId, ids)).groupBy(clientFavorites.modelId),
      byModel(clientFavorites.modelId).from(clientFavorites).where(and(inArray(clientFavorites.modelId, ids), gte(clientFavorites.createdAt, since7))).groupBy(clientFavorites.modelId),
      byModel(clientFavorites.modelId).from(clientFavorites).where(and(inArray(clientFavorites.modelId, ids), gte(clientFavorites.createdAt, since30))).groupBy(clientFavorites.modelId),
      byModel(modelContactEvents.modelId).from(modelContactEvents).where(and(inArray(modelContactEvents.modelId, ids), gte(modelContactEvents.createdAt, since7))).groupBy(modelContactEvents.modelId),
      byModel(modelContactEvents.modelId).from(modelContactEvents).where(and(inArray(modelContactEvents.modelId, ids), gte(modelContactEvents.createdAt, since30))).groupBy(modelContactEvents.modelId),
      this.db
        .select({ channel: modelContactEvents.channel, value: count() })
        .from(modelContactEvents)
        .where(and(inArray(modelContactEvents.modelId, ids), gte(modelContactEvents.createdAt, since30)))
        .groupBy(modelContactEvents.channel),
    ]);

    const toMap = (rows: { modelId: string; value: number }[]) =>
      new Map<string, number>(rows.map((r) => [r.modelId, Number(r.value)]));

    const viewsTotalMap = toMap(viewsTotalRows);
    const views7Map = toMap(views7Rows);
    const views30Map = toMap(views30Rows);
    const favCurrentMap = toMap(favCurrentRows);
    const fav7Map = toMap(fav7Rows);
    const fav30Map = toMap(fav30Rows);
    const contacts7Map = toMap(contacts7Rows);
    const contacts30Map = toMap(contacts30Rows);

    const byChannel: Record<ContactChannel, number> = { ...emptyByChannel };
    for (const row of byChannelRows as { channel: ContactChannel; value: number }[]) {
      byChannel[row.channel] = Number(row.value);
    }

    const models: ManagerModelStat[] = roster.map((r: { id: string; displayName: string; slug: string | null; mainPhotoUrl: string | null }) => ({
      id: r.id,
      displayName: r.displayName,
      slug: r.slug,
      mainPhotoUrl: r.mainPhotoUrl,
      views: {
        total: viewsTotalMap.get(r.id) ?? 0,
        last7Days: views7Map.get(r.id) ?? 0,
        last30Days: views30Map.get(r.id) ?? 0,
      },
      favorites: {
        current: favCurrentMap.get(r.id) ?? 0,
        added7Days: fav7Map.get(r.id) ?? 0,
        added30Days: fav30Map.get(r.id) ?? 0,
      },
      contacts: {
        total7Days: contacts7Map.get(r.id) ?? 0,
        total30Days: contacts30Map.get(r.id) ?? 0,
      },
    }));

    const sum = (m: Map<string, number>) => ids.reduce((acc, id) => acc + (m.get(id) ?? 0), 0);

    return {
      modelsCount: ids.length,
      totals: {
        views: {
          total: sum(viewsTotalMap),
          last7Days: sum(views7Map),
          last30Days: sum(views30Map),
        },
        favorites: {
          current: sum(favCurrentMap),
          added7Days: sum(fav7Map),
          added30Days: sum(fav30Map),
        },
        contacts: {
          total7Days: sum(contacts7Map),
          total30Days: sum(contacts30Map),
          byChannel,
        },
      },
      models,
    };
  }
}
