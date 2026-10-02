'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { describedBy, Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Panel } from '@/features/admin/components/admin-page';
import {
  passwordConfirmationSchema,
  totpCodeSchema,
  type PasswordConfirmationInput,
  type TotpCodeInput,
} from '@/schemas/auth.schema';

import { confirmTwoFactorSetupAction, startTwoFactorSetupAction, type TwoFactorSetup as SetupData } from '../actions';
import { BackupCodes } from './backup-codes';

function FormError({ id, message }: { id: string; message: string | null }) {
  return message ? (
    <p id={id} role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
      {message}
    </p>
  ) : null;
}

/**
 * Mandatory first-time setup of two-factor authentication. The admin panel
 * stays locked (every page and action) until it is completed. Backup codes are
 * shown before the final confirmation: once 2FA is on, the session is renewed
 * and the page switches to its "enabled" state.
 */
export function TwoFactorSetup() {
  const router = useRouter();
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [savedCodes, setSavedCodes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordForm = useForm<PasswordConfirmationInput>({
    resolver: zodResolver(passwordConfirmationSchema),
    defaultValues: { password: '' },
  });
  const codeForm = useForm<TotpCodeInput>({ resolver: zodResolver(totpCodeSchema), defaultValues: { code: '' } });

  const start = passwordForm.handleSubmit(async (values) => {
    setError(null);
    const result = await startTwoFactorSetupAction(values);
    passwordForm.reset();
    if (result.ok) setSetup(result.data);
    else setError(result.error);
  });

  const confirm = codeForm.handleSubmit(async (values) => {
    setError(null);
    if (!savedCodes) {
      setError('Save your backup codes first, then tick the box.');
      return;
    }
    const result = await confirmTwoFactorSetupAction(values);
    if (result.ok) {
      toast.success('Two-factor authentication is on.');
      router.replace('/admin');
      router.refresh();
    } else {
      setError(result.error);
      codeForm.resetField('code');
    }
  });

  if (setup) {
    const { errors, isSubmitting } = codeForm.formState;
    return (
      <div className="space-y-6">
        <Panel title="2. Add this site to your authenticator app" description="Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden…">
          <div className="grid gap-8 md:grid-cols-[13rem_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element -- local SVG data URL, nothing to optimise */}
            <img src={setup.qrCode} alt="QR code to add this site to an authenticator app" className="size-52 rounded-lg border border-rule bg-white p-2" />
            <div>
              <p className="text-sm text-navy-800">Scan the QR code, or type this key into the app:</p>
              <p className="mt-2 break-all rounded-md bg-mist px-3 py-2 text-sm font-medium tracking-wider text-ink tabular">
                {setup.secret.replace(/(.{4})/g, '$1 ').trim()}
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="3. Save your backup codes" description="If you lose your phone, each code signs you in once.">
          <BackupCodes codes={setup.backupCodes} />
        </Panel>

        <Panel title="4. Confirm with a code from the app">
          <form onSubmit={confirm} noValidate className="max-w-md space-y-4" aria-describedby={error ? 'setup-error' : undefined}>
            <label className="flex items-start gap-3 text-sm text-navy-800">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-teal-600"
                checked={savedCodes}
                onChange={(event) => setSavedCodes(event.target.checked)}
              />
              I saved my backup codes somewhere safe.
            </label>
            <Field id="setup-code" label="6-digit code from the app" error={errors.code?.message}>
              <Input
                id="setup-code"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                className="max-w-40 tabular tracking-[0.2em]"
                aria-invalid={Boolean(errors.code)}
                aria-describedby={describedBy('setup-code', Boolean(errors.code))}
                {...codeForm.register('code')}
              />
            </Field>
            <FormError id="setup-error" message={error} />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
              Turn on two-factor authentication
            </Button>
          </form>
        </Panel>
      </div>
    );
  }

  const { errors, isSubmitting } = passwordForm.formState;
  return (
    <Panel
      title="1. Confirm your password"
      description="Two-factor authentication is required before you can use the admin panel."
    >
      <form onSubmit={start} noValidate className="max-w-sm space-y-4" aria-describedby={error ? 'setup-error' : undefined}>
        <Field id="setup-password" label="Password" error={errors.password?.message}>
          <Input
            id="setup-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={describedBy('setup-password', Boolean(errors.password))}
            {...passwordForm.register('password')}
          />
        </Field>
        <FormError id="setup-error" message={error} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          Continue
        </Button>
      </form>
    </Panel>
  );
}
