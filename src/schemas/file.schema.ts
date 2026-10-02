import { z } from 'zod';

import { uuidSchema } from './common';

export const fileUpdateSchema = z.object({
  id: uuidSchema,
  label: z.string().trim().max(200).optional(),
  visibility: z.enum(['public', 'private']).optional(),
});
