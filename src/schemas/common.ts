import { z } from 'zod';

import { normalizeDoi } from '@/utils/doi';
import { SLUG_PATTERN } from '@/utils/slugify';

export const uuidSchema = z.uuid({ error: 'Invalid identifier.' });

/** Optional text that turns "" into null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters.`)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null);

export const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === '' || /^https?:\/\/[^\s<>"]+$/i.test(value), 'Enter a full URL starting with https://')
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export const optionalDoi = z
  .string()
  .trim()
  .max(300)
  .transform((value, context) => {
    if (value === '') return null;
    const doi = normalizeDoi(value);
    if (!doi) {
      context.addIssue({ code: 'custom', message: 'Enter a DOI like 10.1000/xyz123' });
      return z.NEVER;
    }
    return doi;
  })
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export const slugInput = z
  .string()
  .trim()
  .max(120)
  .refine((value) => value === '' || SLUG_PATTERN.test(value), 'Use lowercase letters, numbers and single hyphens.');

export const optionalUuid = z
  .union([uuidSchema, z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const imagePathSchema = z
  .string()
  .trim()
  .max(200)
  .refine((value) => value === '' || /^(articles|profile|projects)\/[0-9a-f-]{36}\.(jpg|png|webp|avif|gif)$/.test(value), 'Invalid image.')
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional()
  .transform((value) => value ?? null);
