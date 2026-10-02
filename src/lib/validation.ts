import type { z } from 'zod';

import { fail, type FieldErrors } from './action-result';

/**
 * Converts Zod issues to field errors keyed by their full path
 * ("references.0.title"), which React Hook Form can attach to the right input.
 */
export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || 'form';
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

/** Standard failure for invalid input: names the first problem and returns every field error. */
export function invalidInput(error: z.ZodError) {
  const first = error.issues[0]?.message;
  return fail(first ? `Check the highlighted fields: ${first}` : 'Check the highlighted fields.', {
    fieldErrors: fieldErrorsFrom(error),
  });
}
