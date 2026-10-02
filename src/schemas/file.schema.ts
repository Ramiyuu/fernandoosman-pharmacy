import { z } from 'zod';

import { uuidSchema } from './common';

/** Metadata the browser sends *before* uploading. Every value is re-checked after upload. */
export const pdfUploadIntentSchema = z.discriminatedUnion('target', [
  z.object({
    target: z.literal('article'),
    articleId: uuidSchema,
    filename: z.string().min(1).max(255),
    size: z.number().int().positive(),
    mimeType: z.string().max(100),
  }),
  z.object({
    target: z.literal('cv'),
    filename: z.string().min(1).max(255),
    size: z.number().int().positive(),
    mimeType: z.string().max(100),
  }),
]);

export type PdfUploadIntent = z.infer<typeof pdfUploadIntentSchema>;

export const fileUpdateSchema = z.object({
  id: uuidSchema,
  label: z.string().trim().max(200).optional(),
  visibility: z.enum(['public', 'private']).optional(),
});
