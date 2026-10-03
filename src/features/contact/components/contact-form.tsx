'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheck, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { describedBy, Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import type { Locale } from '@/i18n/config';
import { contactSchemaWith, type ContactInput } from '@/schemas/contact.schema';

import { submitContactAction } from '../actions';

/** Every string the form shows, already in the visitor's language. */
export interface ContactFormCopy {
  name: string;
  email: string;
  subject: string;
  message: string;
  consentBefore: string;
  consentLink: string;
  consentAfter: string;
  sentTitle: string;
  sentBody: string;
  sendAnother: string;
  send: string;
  retention: string;
  unreachable: string;
  validation: {
    name: string;
    email: string;
    message: string;
    consent: string;
    /** "Use at most N characters." keyed by N (120, 200, 5000). */
    tooLong: Record<number, string>;
  };
}

export function ContactForm({ locale, copy, privacyHref }: { locale: Locale; copy: ContactFormCopy; privacyHref: string }) {
  const [status, setStatus] = useState<'idle' | 'sent'>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(
    () =>
      contactSchemaWith({
        ...copy.validation,
        tooLong: (max) => copy.validation.tooLong[max] ?? copy.validation.tooLong[5000],
      }),
    [copy.validation],
  );

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', subject: '', message: '', consent: false, website: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await submitContactAction(values, locale).catch(() => null);
    if (!result) {
      setFormError(copy.unreachable);
      return;
    }
    if (result.ok) {
      reset();
      setStatus('sent');
      return;
    }
    for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (messages?.[0]) setError(field as keyof ContactInput, { message: messages[0] });
    }
    setFormError(result.error);
  });

  if (status === 'sent') {
    return (
      <div role="status" className="contact-sent rounded-xl border border-teal-100 bg-teal-50 p-6">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <CircleCheck className="size-5 text-teal-700" aria-hidden="true" /> {copy.sentTitle}
        </p>
        <p className="mt-2 text-sm text-navy-800">{copy.sentBody}</p>
        <Button variant="link" className="mt-3" onClick={() => setStatus('idle')}>
          {copy.sendAnother}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5" aria-describedby={formError ? 'contact-form-error' : undefined}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="contact-name" label={copy.name} required error={errors.name?.message}>
          <Input
            id="contact-name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy('contact-name', Boolean(errors.name))}
            {...register('name')}
          />
        </Field>
        <Field id="contact-email" label={copy.email} required error={errors.email?.message}>
          <Input
            id="contact-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy('contact-email', Boolean(errors.email))}
            {...register('email')}
          />
        </Field>
      </div>
      <Field id="contact-subject" label={copy.subject} error={errors.subject?.message}>
        <Input
          id="contact-subject"
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={describedBy('contact-subject', Boolean(errors.subject))}
          {...register('subject')}
        />
      </Field>
      <Field id="contact-message" label={copy.message} required error={errors.message?.message}>
        <Textarea
          id="contact-message"
          rows={7}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={describedBy('contact-message', Boolean(errors.message))}
          {...register('message')}
        />
      </Field>

      <div>
        <div className="flex items-start gap-3">
          <input
            id="contact-consent"
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-teal-600"
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? 'contact-consent-error' : undefined}
            {...register('consent')}
          />
          <label htmlFor="contact-consent" className="text-sm text-navy-800">
            {copy.consentBefore}{' '}
            <Link href={privacyHref} className="font-medium text-azure-700 underline underline-offset-2">
              {copy.consentLink}
            </Link>
            {copy.consentAfter}
          </label>
        </div>
        {errors.consent?.message ? (
          <p id="contact-consent-error" className="mt-1.5 text-sm text-danger-700">
            {errors.consent.message}
          </p>
        ) : null}
      </div>

      {/* Honeypot: visually hidden and skipped by assistive technology. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      {formError ? (
        <p id="contact-form-error" role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {formError}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        {copy.send}
      </Button>
      <p className="text-xs text-muted">{copy.retention}</p>
    </form>
  );
}
