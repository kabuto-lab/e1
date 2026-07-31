import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { massageMasters, type MassageMaster, type NewMassageMaster } from '@escort/db';

@Injectable()
export class MastersService {
  constructor(@Inject('DRIZZLE') private readonly db: any) {}

  private generateSlug(name: string): string {
    const translitMap: Record<string, string> = {
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y',
      к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
      х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ы: 'y', э: 'e', ю: 'yu', я: 'ya', ъ: '', ь: '',
    };
    const base = name
      .toLowerCase()
      .split('')
      .map((c) => translitMap[c] ?? c)
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base}-${suffix}`;
  }

  /** Публичный каталог — только опубликованные мастера. */
  async getPublicCatalog(): Promise<MassageMaster[]> {
    return this.db.select().from(massageMasters).where(eq(massageMasters.isPublished, true)).orderBy(sql`lower(${massageMasters.displayName})`);
  }

  /** Для админки — все мастера. */
  async getAll(): Promise<MassageMaster[]> {
    return this.db.select().from(massageMasters).orderBy(sql`lower(${massageMasters.displayName})`);
  }

  async findBySlugPublic(slug: string): Promise<MassageMaster | null> {
    const found = await this.db
      .select()
      .from(massageMasters)
      .where(and(eq(massageMasters.slug, slug), eq(massageMasters.isPublished, true)))
      .limit(1);
    return found[0] ?? null;
  }

  async findById(id: string): Promise<MassageMaster | null> {
    const found = await this.db.select().from(massageMasters).where(eq(massageMasters.id, id)).limit(1);
    return found[0] ?? null;
  }

  async create(data: {
    displayName: string;
    slug?: string;
    description?: string;
    priceFrom?: number;
    mainPhotoUrl?: string;
    photoUrls?: string[];
    isPopular?: boolean;
    isPublished?: boolean;
  }): Promise<MassageMaster> {
    let slug = data.slug?.trim();
    if (slug) {
      const existing = await this.db.select().from(massageMasters).where(eq(massageMasters.slug, slug)).limit(1);
      if (existing[0]) throw new ConflictException('Такой slug уже занят');
    } else {
      slug = this.generateSlug(data.displayName);
    }

    const values: NewMassageMaster = {
      displayName: data.displayName,
      slug,
      description: data.description,
      priceFrom: data.priceFrom?.toString(),
      mainPhotoUrl: data.mainPhotoUrl,
      photoUrls: data.photoUrls,
      isPopular: data.isPopular ?? false,
      isPublished: data.isPublished ?? false,
    };
    const created = await this.db.insert(massageMasters).values(values).returning();
    return created[0];
  }

  async update(
    id: string,
    patch: Partial<Omit<NewMassageMaster, 'priceFrom'>> & { priceFrom?: number },
  ): Promise<MassageMaster> {
    const { priceFrom, ...rest } = patch;
    const set: Partial<NewMassageMaster> = { ...rest, updatedAt: new Date() };
    if (priceFrom !== undefined) set.priceFrom = priceFrom.toString();

    const updated = await this.db.update(massageMasters).set(set).where(eq(massageMasters.id, id)).returning();
    if (!updated[0]) throw new NotFoundException('Мастер не найден');
    return updated[0];
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.db.delete(massageMasters).where(eq(massageMasters.id, id)).returning();
    if (!deleted[0]) throw new NotFoundException('Мастер не найден');
  }
}
