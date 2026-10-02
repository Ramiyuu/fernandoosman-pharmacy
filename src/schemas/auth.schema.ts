import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email('Enter a valid email address.').trim().toLowerCase().max(254),
  password: z.string().min(1, 'Enter your password.').max(256),
  next: z.string().max(512).optional(),
});

export const twoFactorSchema = z
  .object({
    method: z.enum(['totp', 'backup']),
    code: z.string().trim().max(32),
    next: z.string().max(512).optional(),
  })
  .superRefine((value, context) => {
    const valid = value.method === 'totp' ? /^\d{6}$/.test(value.code) : /^[A-Za-z0-9-]{8,20}$/.test(value.code);
    if (!valid) {
      context.addIssue({
        code: 'custom',
        path: ['code'],
        message: value.method === 'totp' ? 'Enter the 6-digit code from your authenticator app.' : 'Enter one of your backup codes.',
      });
    }
  });

export const passwordConfirmationSchema = z.object({
  password: z.string().min(1, 'Enter your password.').max(256),
});

export const totpCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.').max(256),
    newPassword: z.string().min(12, 'Use at least 12 characters. A passphrase works well.').max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The passwords do not match.',
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password different from the current one.',
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type TwoFactorInput = z.infer<typeof twoFactorSchema>;
export type PasswordConfirmationInput = z.infer<typeof passwordConfirmationSchema>;
export type TotpCodeInput = z.infer<typeof totpCodeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
