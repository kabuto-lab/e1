/**
 * Relations Index - объединяет все relations
 * 
 * Примечание: Drizzle требует чтобы relations были определены
 * после всех таблиц, поэтому этот файл импортирует всё
 */

import { usersRelations } from './users';
import { clientProfilesRelations } from './client-profiles';
import { modelProfilesRelations } from './model-profiles';
import { bookingsRelations } from './bookings';
import { escrowTransactionsRelations } from './escrow';
import { reviewsRelations } from './reviews';
import { mediaFilesRelations } from './media';
import { bookingAuditLogsRelations } from './audit';
import { sessionsRelations } from './sessions';

export {
  usersRelations,
  clientProfilesRelations,
  modelProfilesRelations,
  bookingsRelations,
  escrowTransactionsRelations,
  reviewsRelations,
  mediaFilesRelations,
  bookingAuditLogsRelations,
  sessionsRelations,
};
