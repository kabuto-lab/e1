/**
 * Zod Validation Schemas
 * Shared validation between frontend forms
 */

import { z } from 'zod';

// Physical attributes schema
export const physicalAttributesSchema = z.object({
  age: z.coerce.number().optional().nullable(),
  height: z.coerce.number().optional().nullable(),
  weight: z.coerce.number().optional().nullable(),
  bustSize: z.coerce.number().optional().nullable(),
  bustType: z.enum(['natural', 'silicone']).optional().nullable(),
  bodyType: z.enum(['slim', 'curvy', 'bbw', 'pear', 'fit']).optional().nullable(),
  temperament: z.enum(['gentle', 'active', 'adaptable']).optional().nullable(),
  sexuality: z.enum(['active', 'passive', 'universal']).optional().nullable(),
  hairColor: z.string().optional().nullable(),
  eyeColor: z.string().optional().nullable(),
});

// Create profile schema
export const createProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Введите имя'),
  slug: z
    .string()
    .optional()
    .or(z.literal('')),
  biography: z
    .string()
    .optional()
    .or(z.literal('')),
  physicalAttributes: physicalAttributesSchema.optional().nullable(),
  languages: z.array(z.string()).optional(),
  psychotypeTags: z.array(z.string()).optional(),
  rateHourly: z.coerce.number().optional().nullable(),
  rateOvernight: z.coerce.number().optional().nullable(),
});

// File upload schema
export const fileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 104857600, 'File size must be less than 100MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(file.type),
      'Only JPEG, PNG, WebP, MP4, and WebM files are allowed'
    ),
});

// Type exports
export type PhysicalAttributesInput = z.infer<typeof physicalAttributesSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
