'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { invalidInput } from '@/lib/validation';
import { createLogger, describeError } from '@/lib/logger';
import { rateLimit } from '@/lib/security/rate-limit';
import { getClientIp } from '@/lib/security/request';
import { createServiceSupabase } from '@/lib/supabase/admin';
import { contactSchema, type ContactInput } from '@/schemas/contact.schema';

const log = createLogger('contact');

export async function submitContactAction(input: ContactInput): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }

  // Bots that fill the honeypot get a success response and nothing is stored.
  if (parsed.data.website) return ok(undefined);

  const limit = await rateLimit('contact', await getClientIp());
  if (!limit.success) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return fail(`Too many messages from this connection. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`, {
      code: 'RATE_LIMITED',
    });
  }

  // The public role cannot insert into `contacts` (no RLS policy); the server
  // inserts with the service role after validation and rate limiting.
  const { name, email, subject, message } = parsed.data;
  const { error } = await createServiceSupabase().from('contacts').insert({ name, email, subject, message });
  if (error) {
    log.error('Failed to store contact message', { error: describeError(error) });
    return fail('Your message could not be sent right now. Try again later.');
  }

  return ok(undefined, 'Message sent.');
}
