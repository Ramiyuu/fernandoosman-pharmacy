'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheck, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { describedBy, Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Panel } from '@/features/admin/components/admin-page';
import { useActionRunner } from '@/hooks/use-action-runner';
import {
  changePasswordSchema,
  passwordConfirmationSchema,
  type ChangePasswordInput,
  type PasswordConfirmationInput,
} from '@/schemas/auth.schema';

import { changePasswordAction, regenerateBackupCodesAction, signOutOtherSessionsAction } from '../actions';
import { BackupCodes } from './backup-codes';

function BackupCodesPanel() {
  const { run } = useActionRunner();
  const [codes, setCodes] = useState<string[] | null>(null);
  const form = useForm<PasswordConfirmationInput>({
    resolver: zodResolver(passwordConfirmationSchema),
    defaultValues: { password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      const result = await run(() => regenerateBackupCodesAction(values), { refresh: false });
      setCodes(result.backupCodes);
    } catch {
      // The toast already explains what went wrong.
    }
    form.reset();
  });

  return (
    <Panel
      title="Two-factor authentication"
      description="Required at every sign-in. Lost your phone? Sign in with a backup code, or run npm run admin -- reset-2fa on the server."
    >
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <CircleCheck className="size-4 text-teal-700" aria-hidden="true" /> On, with an authenticator app
      </p>
      {codes ? (
        <div className="mt-5">
          <BackupCodes codes={codes} />
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-5 flex max-w-md flex-wrap items-end gap-3">
          <Field id="backup-password" label="Password" error={errors.password?.message} className="min-w-56 flex-1">
            <Input
              id="backup-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={describedBy('backup-password', Boolean(errors.password))}
              {...form.register('password')}
            />
          </Field>
          <Button type="submit" variant="secondary" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
            Generate new backup codes
          </Button>
        </form>
      )}
    </Panel>
  );
}

function PasswordPanel() {
  const { run } = useActionRunner();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      await run(() => changePasswordAction(values));
      form.reset();
    } catch {
      form.resetField('currentPassword');
    }
  });

  const fields = [
    { name: 'currentPassword', label: 'Current password', autoComplete: 'current-password' },
    { name: 'newPassword', label: 'New password', autoComplete: 'new-password' },
    { name: 'confirmPassword', label: 'Repeat the new password', autoComplete: 'new-password' },
  ] as const;

  return (
    <Panel title="Password" description="At least 12 characters. Changing it signs out every other device.">
      <form onSubmit={submit} noValidate className="max-w-md space-y-4">
        {fields.map((field) => (
          <Field key={field.name} id={`password-${field.name}`} label={field.label} error={errors[field.name]?.message}>
            <Input
              id={`password-${field.name}`}
              type="password"
              autoComplete={field.autoComplete}
              aria-invalid={Boolean(errors[field.name])}
              aria-describedby={describedBy(`password-${field.name}`, Boolean(errors[field.name]))}
              {...form.register(field.name)}
            />
          </Field>
        ))}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          Change password
        </Button>
      </form>
    </Panel>
  );
}

function SessionsPanel() {
  const { run, isPending } = useActionRunner();
  const [busy, setBusy] = useState(false);

  return (
    <Panel title="Devices" description="Sessions end after 12 hours without activity, or when the browser closes.">
      <Button
        variant="secondary"
        disabled={busy || isPending}
        onClick={async () => {
          setBusy(true);
          await run(() => signOutOtherSessionsAction()).catch(() => undefined);
          setBusy(false);
        }}
      >
        {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        Sign out all other devices
      </Button>
    </Panel>
  );
}

export function SecuritySettings() {
  return (
    <div className="space-y-6">
      <BackupCodesPanel />
      <PasswordPanel />
      <SessionsPanel />
    </div>
  );
}
