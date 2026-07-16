import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { users, managerProfiles } from '@escort/db';

@Injectable()
export class ManagersService {
  constructor(@Inject('DRIZZLE') private readonly db: any) {}

  async createProfile(
    userId: string,
    data: {
      fullName: string;
      companyName?: string;
      phone?: string;
      telegramContact?: string;
    },
  ) {
    const [profile] = await this.db
      .insert(managerProfiles)
      .values({
        userId,
        fullName: data.fullName,
        companyName: data.companyName ?? null,
        phone: data.phone ?? null,
        telegramContact: data.telegramContact ?? null,
      })
      .returning();
    return profile;
  }

  /** Менеджер обновляет свои телефон/telegram/компанию (имя — не через этот endpoint). */
  async updateOwnProfile(userId: string, data: { phone?: string; telegramContact?: string; companyName?: string }) {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (data.phone !== undefined) patch.phone = data.phone.trim() || null;
    if (data.telegramContact !== undefined) patch.telegramContact = data.telegramContact.trim() || null;
    if (data.companyName !== undefined) patch.companyName = data.companyName.trim() || null;

    const [updated] = await this.db
      .update(managerProfiles)
      .set(patch)
      .where(eq(managerProfiles.userId, userId))
      .returning();

    if (!updated) throw new NotFoundException('Manager profile not found');
    return updated;
  }

  async listApplications() {
    return this.db
      .select({
        id: users.id,
        email: users.emailHash,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        profile: {
          id: managerProfiles.id,
          fullName: managerProfiles.fullName,
          companyName: managerProfiles.companyName,
          phone: managerProfiles.phone,
          telegramContact: managerProfiles.telegramContact,
          reviewNote: managerProfiles.reviewNote,
          approvedAt: managerProfiles.approvedAt,
          rejectedAt: managerProfiles.rejectedAt,
          rejectionReason: managerProfiles.rejectionReason,
          profileCreatedAt: managerProfiles.createdAt,
        },
      })
      .from(users)
      .leftJoin(managerProfiles, eq(managerProfiles.userId, users.id))
      .where(eq(users.role, 'manager'))
      .orderBy(users.createdAt);
  }

  async approve(userId: string, adminId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.role, 'manager')))
      .limit(1);

    if (!user) throw new NotFoundException('Manager not found');
    if (user.status === 'active') throw new BadRequestException('Already approved');

    await this.db
      .update(users)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(users.id, userId));

    await this.db
      .update(managerProfiles)
      .set({ approvedBy: adminId, approvedAt: new Date(), rejectedAt: null, rejectionReason: null, updatedAt: new Date() })
      .where(eq(managerProfiles.userId, userId));

    return { success: true };
  }

  async reject(userId: string, reason?: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.role, 'manager')))
      .limit(1);

    if (!user) throw new NotFoundException('Manager not found');

    await this.db
      .update(users)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(users.id, userId));

    await this.db
      .update(managerProfiles)
      .set({ rejectedAt: new Date(), rejectionReason: reason ?? null, approvedAt: null, approvedBy: null, updatedAt: new Date() })
      .where(eq(managerProfiles.userId, userId));

    return { success: true };
  }

  async getProfile(userId: string) {
    const [profile] = await this.db
      .select()
      .from(managerProfiles)
      .where(eq(managerProfiles.userId, userId))
      .limit(1);
    return profile ?? null;
  }
}
