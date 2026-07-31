import { Inject, Injectable } from '@nestjs/common';
import { desc } from 'drizzle-orm';
import { massageAccessRequests, type MassageAccessRequest, type NewMassageAccessRequest } from '@escort/db';
import { MassageNotifyService } from '../notify.service';

@Injectable()
export class AccessRequestsService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
    private readonly notify: MassageNotifyService,
  ) {}

  async create(data: { name: string; contact: string; comment?: string }): Promise<MassageAccessRequest> {
    const values: NewMassageAccessRequest = {
      name: data.name,
      contact: data.contact,
      comment: data.comment,
    };
    const created = await this.db.insert(massageAccessRequests).values(values).returning();
    const request = created[0];

    const text =
      `🔑 Запрос доступа к закрытому каталогу мастеров\n` +
      `Имя: ${data.name}\n` +
      `Контакт: ${data.contact}\n` +
      (data.comment ? `Комментарий: ${data.comment}\n` : '');
    await this.notify.notifyAdmins('Запрос доступа к каталогу мастеров', text);

    return request;
  }

  async getAll(): Promise<MassageAccessRequest[]> {
    return this.db.select().from(massageAccessRequests).orderBy(desc(massageAccessRequests.createdAt));
  }
}
