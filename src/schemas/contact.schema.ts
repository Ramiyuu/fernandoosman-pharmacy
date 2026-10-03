import { z } from 'zod';

export interface ContactMessages {
  name: string;
  email: string;
  tooLong: (max: number) => string;
  message: string;
  consent: string;
}

const ENGLISH: ContactMessages = {
  name: 'Enter your name.',
  email: 'Enter a valid email address.',
  tooLong: (max) => `Use at most ${max.toLocaleString('en-GB')} characters.`,
  message: 'Write at least 10 characters.',
  consent: 'Accept the privacy notice to send your message.',
};

/** The contact form's rules, with error messages in the visitor's language. */
export function contactSchemaWith(messages: ContactMessages = ENGLISH) {
  return z.object({
    name: z.string().trim().min(2, messages.name).max(120, messages.tooLong(120)),
    email: z.email(messages.email).trim().max(254),
    subject: z.string().trim().max(200, messages.tooLong(200)),
    message: z.string().trim().min(10, messages.message).max(5000, messages.tooLong(5000)),
    // LGPD: the sender must accept the privacy notice; checked again on the server.
    consent: z.boolean().refine((value) => value, messages.consent),
    // Honeypot: hidden from people, filled in by naive bots.
    website: z.string().max(200),
  });
}

export const contactSchema = contactSchemaWith();

export type ContactInput = z.infer<typeof contactSchema>;
