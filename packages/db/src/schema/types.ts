/**
 * Type exports - все типы для использования в коде
 */

import type {
  User,
  NewUser,
} from './users';

import type {
  ClientProfile,
  NewClientProfile,
} from './client-profiles';

import type {
  ModelProfile,
  NewModelProfile,
} from './model-profiles';

import type {
  Booking,
  NewBooking,
} from './bookings';

import type {
  EscrowTransaction,
  NewEscrowTransaction,
} from './escrow';

import type {
  Review,
  NewReview,
} from './reviews';

import type {
  Blacklist,
  NewBlacklist,
} from './blacklists';

import type {
  MediaFile,
  NewMediaFile,
} from './media';

import type {
  BookingAuditLog,
  NewBookingAuditLog,
} from './audit';

import type {
  Session,
  NewSession,
} from './sessions';

// Enums
export type UserRole = 'admin' | 'manager' | 'moderator' | 'model' | 'client';
export type UserStatus = 'active' | 'suspended' | 'pending_verification' | 'blacklisted';
export type VipTier = 'standard' | 'silver' | 'gold' | 'platinum';
export type Psychotype = 'dominant' | 'intellectual' | 'playful' | 'romantic' | 'adventurous' | 'light';
export type VerificationStatus = 'pending' | 'video_required' | 'document_required' | 'verified' | 'rejected';
export type AvailabilityStatus = 'offline' | 'online' | 'in_shift' | 'busy';
export type BookingStatus = 'draft' | 'pending_payment' | 'escrow_funded' | 'confirmed' | 'in_progress' | 'completed' | 'disputed' | 'cancelled' | 'refunded';
export type EscrowStatus = 'pending_funding' | 'funded' | 'hold_period' | 'released' | 'refunded' | 'disputed_hold' | 'partially_refunded';
export type BlacklistReason = 'fake_photos' | 'client_complaints' | 'fraud' | 'no_show' | 'video_fake' | 'non_payment' | 'rudeness' | 'pressure';
export type FileType = 'photo' | 'video' | 'document';
export type LocationType = 'incall' | 'outcall' | 'travel' | 'hotel' | 'dacha';
export type PaymentProvider = 'yookassa' | 'cryptomus' | 'manual';
export type ReleaseTrigger = 'auto_after_hold' | 'manual_confirm' | 'dispute_resolution' | 'admin_override';

// Complex types
export type PhysicalAttributes = {
  age?: number;
  height?: number;
  weight?: number;
  bustSize?: number;
  bustType?: 'natural' | 'silicone';
  bodyType?: 'slim' | 'curvy' | 'bbw' | 'pear' | 'fit';
  temperament?: 'gentle' | 'active' | 'adaptable';
  sexuality?: 'active' | 'passive' | 'universal';
};

export type ClientPreferences = {
  languages?: string[];
  ageRange?: [number, number];
  physicalTypes?: string[];
  temperament?: string;
};

export type StateHistoryEntry = {
  fromStatus: string;
  toStatus: string;
  triggeredBy: string;
  timestamp: string;
  reason?: string;
};

// Export all entity types
export type {
  User,
  NewUser,
  ClientProfile,
  NewClientProfile,
  ModelProfile,
  NewModelProfile,
  Booking,
  NewBooking,
  EscrowTransaction,
  NewEscrowTransaction,
  Review,
  NewReview,
  Blacklist,
  NewBlacklist,
  MediaFile,
  NewMediaFile,
  BookingAuditLog,
  NewBookingAuditLog,
  Session,
  NewSession,
};
