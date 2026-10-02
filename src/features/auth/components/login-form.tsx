'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { describedBy, Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { magicLinkSchema, signInSchema, type MagicLinkInput, type SignInInput } from '@/schemas/auth.schema';

import { sendMagicLinkAction, signInAction } from '../actions';

export function LoginForm({ next, magicLinkEnabled, initialError }: { next?: string; magicLinkEnabled: boolean; initialError?: string }) {
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [formError, setFormError] = useState<string | null>(initialError ?? null);
  const [notice, setNotice] = useState<string | null>(null);

  const passwordForm = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '', next },
  });
  const linkForm = useForm<MagicLinkInput>({ resolver: zodResolver(magicLinkSchema), defaultValues: { email: '' } });

  const submitPassword = passwordForm.handleSubmit(async (values) => {
    setFormError(null);
    // On success the action redirects; we only get a result back on failure.
    const result = await signInAction(values);
    if (result && !result.ok) {
      setFormError(result.error);
      passwordForm.resetField('password');
    }
  });

  const submitLink = linkForm.handleSubmit(async (values) => {
    setFormError(null);
    setNotice(null);
    const result = await sendMagicLinkAction(values);
    if (result.ok) setNotice(result.message ?? 'Check your inbox.');
    else setFormError(result.error);
  });

  const errorBox = formError ? (
    <p id="login-error" role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
      {formError}
    </p>
  ) : null;

  if (mode === 'link') {
    const { errors, isSubmitting } = linkForm.formState;
    return (
      <form onSubmit={submitLink} noValidate className="space-y-5">
        <Field id="link-email" label="Email" error={errors.email?.message}>
          <Input
            id="link-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy('link-email', Boolean(errors.email))}
            {...linkForm.register('email')}
          />
        </Field>
        {errorBox}
        {notice ? (
          <p role="status" className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-700">
            {notice}
          </p>
        ) : null}
        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          Email me a sign-in link
        </Button>
        <Button variant="link" className="w-full" onClick={() => setMode('password')}>
          Use password instead
        </Button>
      </form>
    );
  }

  const { errors, isSubmitting } = passwordForm.formState;
  return (
    <form onSubmit={submitPassword} noValidate className="space-y-5" aria-describedby={formError ? 'login-error' : undefined}>
      <Field id="login-email" label="Email" error={errors.email?.message}>
        <Input
          id="login-email"
          type="email"
          autoComplete="username"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy('login-email', Boolean(errors.email))}
          {...passwordForm.register('email')}
        />
      </Field>
      <Field id="login-password" label="Password" error={errors.password?.message}>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={describedBy('login-password', Boolean(errors.password))}
          {...passwordForm.register('password')}
        />
      </Field>
      <input type="hidden" {...passwordForm.register('next')} />
      {errorBox}
      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        Sign in
      </Button>
      {magicLinkEnabled ? (
        <Button variant="link" className="w-full" onClick={() => setMode('link')}>
          Email me a sign-in link instead
        </Button>
      ) : null}
    </form>
  );
}
