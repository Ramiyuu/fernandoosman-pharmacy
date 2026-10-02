import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(120, 'Use at most 120 characters.'),
  email: z.email('Enter a valid email address.').trim().max(254),
  subject: z.string().trim().max(200, 'Use at most 200 characters.'),
  message: z.string().trim().min(10, 'Write at least 10 characters.').max(5000, 'Use at most 5,000 characters.'),
  // Honeypot: hidden from people, filled in by naive bots.
  website: z.string().max(200),
});

export type ContactInput = z.infer<typeof contactSchema>;
