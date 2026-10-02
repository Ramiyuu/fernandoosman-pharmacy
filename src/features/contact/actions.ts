'use server';

import { contactRetentionDays } from '@/config/privacy';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { serverDb } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';
import { createLogger, describeError } from '@/lib/logger';
import { rateLimit } from '@/lib/security/rate-limit';
import { getClientIp } from '@/lib/security/request';
import { invalidInput } from '@/lib/validation';
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

  // Stored as web_server, which may insert messages but cannot read them.
  // No IP address or other technical data is kept with the message.
  const { name, email, subject, message } = parsed.data;
  try {
    await serverDb().transaction(async (tx) => {
      await tx.execute(sql`
        insert into public.contacts (name, email, subject, message, consented_at)
        values (${name}, ${email}, ${subject}, ${message}, now())`);
      // LGPD retention: drop messages older than CONTACT_RETENTION_DAYS.
      await tx.execute(sql`select private.purge_expired_contacts(${contactRetentionDays()})`);
    });
  } catch (error) {
    log.error('Failed to store contact message', { error: describeError(error) });
    return fail('Your message could not be sent right now. Try again later.');
  }

  return ok(undefined, 'Message sent.');
}
