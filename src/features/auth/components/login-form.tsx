'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { describedBy, Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { signInSchema, twoFactorSchema, type SignInInput, type TwoFactorInput } from '@/schemas/auth.schema';

import { signInAction, verifyTwoFactorAction } from '../actions';

function ErrorBox({ message }: { message: string | null }) {
  return message ? (
    <p id="login-error" role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
      {message}
    </p>
  ) : null;
}

function TwoFactorStep({ next, onRestart }: { next?: string; onRestart: (message: string) => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<TwoFactorInput>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { method: 'totp', code: '', next },
  });
  const method = useWatch({ control: form.control, name: 'method' });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    // On success the action redirects; a result only comes back on failure.
    const result = await verifyTwoFactorAction(values);
    if (result && !result.ok) {
      if (result.code === 'UNAUTHENTICATED') return onRestart(result.error);
      setFormError(result.error);
      form.resetField('code');
      form.setFocus('code');
    }
  });

  const switchMethod = () => {
    form.setValue('method', method === 'totp' ? 'backup' : 'totp');
    form.resetField('code');
    form.clearErrors();
    setFormError(null);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-describedby={formError ? 'login-error' : undefined}>
      <div className="flex gap-3 rounded-md bg-mist px-3 py-3 text-sm text-navy-800">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-700" aria-hidden="true" />
        <p>
          {method === 'totp'
            ? 'Open your authenticator app and enter the 6-digit code for this site.'
            : 'Enter one of the backup codes you saved when you set up two-factor authentication. Each code works once.'}
        </p>
      </div>
      <Field id="login-code" label={method === 'totp' ? 'Authentication code' : 'Backup code'} error={errors.code?.message}>
        <Input
          id="login-code"
          autoFocus
          autoComplete="one-time-code"
          inputMode={method === 'totp' ? 'numeric' : 'text'}
          maxLength={method === 'totp' ? 6 : 20}
          className="tabular tracking-[0.2em]"
          aria-invalid={Boolean(errors.code)}
          aria-describedby={describedBy('login-code', Boolean(errors.code))}
          {...form.register('code')}
        />
      </Field>
      <ErrorBox message={formError} />
      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        Verify and sign in
      </Button>
      <Button type="button" variant="link" className="w-full" onClick={switchMethod}>
        {method === 'totp' ? 'Use a backup code instead' : 'Use the authenticator app instead'}
      </Button>
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [step, setStep] = useState<'password' | 'two-factor'>('password');
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '', next },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    // Without 2FA set up yet the action redirects; otherwise it asks for the code.
    const result = await signInAction(values);
    if (!result) return;
    if (result.ok) {
      form.resetField('password');
      setStep('two-factor');
      return;
    }
    setFormError(result.error);
    form.resetField('password');
  });

  if (step === 'two-factor') {
    return (
      <TwoFactorStep
        next={next}
        onRestart={(message) => {
          setFormError(message);
          setStep('password');
        }}
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-describedby={formError ? 'login-error' : undefined}>
      <Field id="login-email" label="Email" error={errors.email?.message}>
        <Input
          id="login-email"
          type="email"
          autoComplete="username"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy('login-email', Boolean(errors.email))}
          {...form.register('email')}
        />
      </Field>
      <Field id="login-password" label="Password" error={errors.password?.message}>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={describedBy('login-password', Boolean(errors.password))}
          {...form.register('password')}
        />
      </Field>
      <input type="hidden" {...form.register('next')} />
      <ErrorBox message={formError} />
      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        Continue
      </Button>
    </form>
  );
}
