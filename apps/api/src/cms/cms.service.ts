import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, desc, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { cmsPages } from '@escort/db';
import type { CmsPage, NewCmsPage } from '@escort/db';

const RU_MAP: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',
  н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',
  ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .split('').map((c) => RU_MAP[c] ?? c).join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class CmsService {
  constructor(@Inject('DRIZZLE') private db: NodePgDatabase<any>) {}

  async findAll(type?: string, status?: string): Promise<CmsPage[]> {
    const conds: SQL[] = [];
    if (type) conds.push(eq(cmsPages.type, type));
    if (status) conds.push(eq(cmsPages.status, status));

    const where =
      conds.length === 0 ? undefined :
      conds.length === 1 ? conds[0] :
      and(...(conds as [SQL, SQL, ...SQL[]]));

    return this.db.select().from(cmsPages).where(where).orderBy(desc(cmsPages.createdAt));
  }

  async findBySlug(slug: string): Promise<CmsPage> {
    const rows = await this.db
      .select()
      .from(cmsPages)
      .where(and(eq(cmsPages.slug, slug), eq(cmsPages.status, 'published')))
      .limit(1);
    if (!rows[0]) throw new NotFoundException('Page not found');
    return rows[0];
  }

  async findById(id: string): Promise<CmsPage> {
    const rows = await this.db.select().from(cmsPages).where(eq(cmsPages.id, id)).limit(1);
    if (!rows[0]) throw new NotFoundException('Page not found');
    return rows[0];
  }

  async create(data: Partial<NewCmsPage> & { authorId?: string }): Promise<CmsPage> {
    const slug = slugify(data.slug || data.title || '') || `page-${Date.now()}`;

    const conflict = await this.db
      .select({ id: cmsPages.id })
      .from(cmsPages)
      .where(eq(cmsPages.slug, slug))
      .limit(1);
    if (conflict[0]) throw new ConflictException(`Slug "${slug}" is already taken`);

    const rows = await this.db
      .insert(cmsPages)
      .values({
        ...data,
        slug,
        type: data.type ?? 'page',
        status: data.status ?? 'draft',
        publishedAt: data.status === 'published' ? new Date() : null,
      } as NewCmsPage)
      .returning();
    return rows[0];
  }

  async update(id: string, data: Partial<NewCmsPage>): Promise<CmsPage> {
    const existing = await this.findById(id);

    let slug = existing.slug;
    if (data.slug && data.slug !== existing.slug) {
      const conflict = await this.db
        .select({ id: cmsPages.id })
        .from(cmsPages)
        .where(eq(cmsPages.slug, data.slug))
        .limit(1);
      if (conflict[0] && conflict[0].id !== id) {
        throw new ConflictException(`Slug "${data.slug}" is already taken`);
      }
      slug = data.slug;
    }

    const publishedAt =
      data.status === 'published' && existing.status !== 'published'
        ? new Date()
        : data.status && data.status !== 'published'
          ? null
          : existing.publishedAt;

    const rows = await this.db
      .update(cmsPages)
      .set({ ...data, slug, updatedAt: new Date(), publishedAt })
      .where(eq(cmsPages.id, id))
      .returning();
    return rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.db.delete(cmsPages).where(eq(cmsPages.id, id));
  }
}
