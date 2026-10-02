import { z } from 'zod';

import { TOPIC_ICON_NAMES } from '@/components/icons/topic-icon';

import { slugInput, uuidSchema } from './common';

export const topicInputSchema = z.object({
  id: uuidSchema.nullable(),
  name: z.string().trim().min(1, 'Add a name.').max(80),
  slug: slugInput,
  description: z.string().trim().max(500),
  icon: z.string().refine((value) => TOPIC_ICON_NAMES.includes(value), 'Choose an icon from the list.'),
  sort_order: z.coerce.number().int().min(-1000).max(1000),
});

export const categoryInputSchema = z.object({
  id: uuidSchema.nullable(),
  name: z.string().trim().min(1, 'Add a name.').max(80),
  slug: slugInput,
  description: z.string().trim().max(500),
  sort_order: z.coerce.number().int().min(-1000).max(1000),
});

export const tagInputSchema = z.object({
  id: uuidSchema.nullable(),
  name: z.string().trim().min(1, 'Add a name.').max(50),
});

export type TopicInput = z.input<typeof topicInputSchema>;
export type CategoryInput = z.input<typeof categoryInputSchema>;
export type TagInput = z.input<typeof tagInputSchema>;
