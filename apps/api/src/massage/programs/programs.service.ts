import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { massageServicePrograms, type MassageServiceProgram, type NewMassageServiceProgram } from '@escort/db';

@Injectable()
export class ProgramsService {
  constructor(@Inject('DRIZZLE') private readonly db: any) {}

  async getByMaster(masterId: string): Promise<MassageServiceProgram[]> {
    return this.db
      .select()
      .from(massageServicePrograms)
      .where(eq(massageServicePrograms.masterId, masterId))
      .orderBy(asc(massageServicePrograms.sortOrder));
  }

  async create(data: {
    masterId: string;
    name: string;
    description?: string;
    price: number;
    durationMinutes?: number;
    sortOrder?: number;
  }): Promise<MassageServiceProgram> {
    const values: NewMassageServiceProgram = {
      masterId: data.masterId,
      name: data.name,
      description: data.description,
      price: data.price.toString(),
      durationMinutes: data.durationMinutes,
      sortOrder: data.sortOrder ?? 0,
    };
    const created = await this.db.insert(massageServicePrograms).values(values).returning();
    return created[0];
  }

  async update(id: string, patch: Partial<NewMassageServiceProgram>): Promise<MassageServiceProgram> {
    const updated = await this.db
      .update(massageServicePrograms)
      .set(patch)
      .where(eq(massageServicePrograms.id, id))
      .returning();
    if (!updated[0]) throw new NotFoundException('Программа не найдена');
    return updated[0];
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.db.delete(massageServicePrograms).where(eq(massageServicePrograms.id, id)).returning();
    if (!deleted[0]) throw new NotFoundException('Программа не найдена');
  }
}
