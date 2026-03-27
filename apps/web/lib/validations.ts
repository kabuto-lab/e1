import { z } from 'zod';

const optionalNumber = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  })
  .optional()
  .nullable();

const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.union([z.enum(values), z.literal('')])
    .transform((val) => (val === '' ? null : val))
    .optional()
    .nullable();

export const physicalAttributesSchema = z.object({
  age: optionalNumber,
  height: optionalNumber,
  weight: optionalNumber,
  bustSize: optionalNumber,
  bustType: optionalEnum(['natural', 'silicone']),
  bodyType: optionalEnum(['slim', 'curvy', 'bbw', 'pear', 'fit']),
  temperament: optionalEnum(['gentle', 'active', 'adaptable']),
  sexuality: optionalEnum(['active', 'passive', 'universal']),
  hairColor: z.string().optional().nullable(),
  eyeColor: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
});

export const createProfileSchema = z.object({
  displayName: z.string().min(1, 'Введите имя'),
  slug: z.string().optional().or(z.literal('')),
  biography: z.string().optional().or(z.literal('')),
  physicalAttributes: physicalAttributesSchema.optional().nullable(),
  languages: z.array(z.string()).optional(),
  psychotypeTags: z.array(z.string()).optional(),
  rateHourly: optionalNumber,
  rateOvernight: optionalNumber,
});

export const fileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 104857600, 'File size must be less than 100MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(file.type),
      'Only JPEG, PNG, WebP, MP4, and WebM files are allowed'
    ),
});

export type PhysicalAttributesInput = z.infer<typeof physicalAttributesSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
