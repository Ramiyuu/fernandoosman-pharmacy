import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email('Enter a valid email address.').trim().toLowerCase().max(254),
  password: z.string().min(1, 'Enter your password.').max(256),
  next: z.string().max(512).optional(),
});

export const magicLinkSchema = z.object({
  email: z.email('Enter a valid email address.').trim().toLowerCase().max(254),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
