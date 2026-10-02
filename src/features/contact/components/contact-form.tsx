'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheck, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { describedBy, Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { contactSchema, type ContactInput } from '@/schemas/contact.schema';

import { submitContactAction } from '../actions';

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sent'>('idle');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', subject: '', message: '', website: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await submitContactAction(values);
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
      <div role="status" className="rounded-xl border border-teal-100 bg-teal-50 p-6">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <CircleCheck className="size-5 text-teal-700" aria-hidden="true" /> Message sent
        </p>
        <p className="mt-2 text-sm text-navy-800">Thanks for writing. You will get a reply at the email address you provided.</p>
        <Button variant="link" className="mt-3" onClick={() => setStatus('idle')}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5" aria-describedby={formError ? 'contact-form-error' : undefined}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="contact-name" label="Name" required error={errors.name?.message}>
          <Input
            id="contact-name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy('contact-name', Boolean(errors.name))}
            {...register('name')}
          />
        </Field>
        <Field id="contact-email" label="Email" required error={errors.email?.message}>
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
      <Field id="contact-subject" label="Subject" error={errors.subject?.message}>
        <Input
          id="contact-subject"
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={describedBy('contact-subject', Boolean(errors.subject))}
          {...register('subject')}
        />
      </Field>
      <Field id="contact-message" label="Message" required error={errors.message?.message}>
        <Textarea
          id="contact-message"
          rows={7}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={describedBy('contact-message', Boolean(errors.message))}
          {...register('message')}
        />
      </Field>

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
        Send message
      </Button>
      <p className="text-xs text-muted">Your name, email and message are stored only to reply to you.</p>
    </form>
  );
}
