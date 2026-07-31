import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { massageBookings, massageMasters, type MassageBooking, type NewMassageBooking } from '@escort/db';
import { MassageNotifyService } from '../notify.service';

@Injectable()
export class MassageBookingsService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
    private readonly notify: MassageNotifyService,
  ) {}

  async create(data: {
    masterId: string;
    name: string;
    contact: string;
    desiredDate?: string;
    comment?: string;
  }): Promise<MassageBooking> {
    const master = await this.db
      .select()
      .from(massageMasters)
      .where(eq(massageMasters.id, data.masterId))
      .limit(1);
    if (!master[0]) throw new NotFoundException('Мастер не найден');

    const values: NewMassageBooking = {
      masterId: data.masterId,
      name: data.name,
      contact: data.contact,
      desiredDate: data.desiredDate,
      comment: data.comment,
    };
    const created = await this.db.insert(massageBookings).values(values).returning();
    const booking = created[0];

    const text =
      `📩 Новая заявка на бронь — «${master[0].displayName}»\n` +
      `Имя: ${data.name}\n` +
      `Контакт: ${data.contact}\n` +
      (data.desiredDate ? `Дата: ${data.desiredDate}\n` : '') +
      (data.comment ? `Комментарий: ${data.comment}\n` : '');
    await this.notify.notifyAdmins(`Заявка на бронь — ${master[0].displayName}`, text);

    return booking;
  }

  async getAll(): Promise<MassageBooking[]> {
    return this.db.select().from(massageBookings).orderBy(desc(massageBookings.createdAt));
  }
}
