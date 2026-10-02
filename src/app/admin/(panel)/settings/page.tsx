import type { Metadata } from 'next';

import { IMAGE_UPLOAD, PDF_UPLOAD } from '@/config/uploads';
import { AdminPage, Panel } from '@/features/admin/components/admin-page';
import { SettingsForm } from '@/features/settings/components/settings-form';
import { requireAdminPage } from '@/lib/auth/session';
import { isMagicLinkEnabled } from '@/lib/env';
import { rateLimitBackend } from '@/lib/security/rate-limit';
import { getSiteSettings } from '@/services/public-content.service';
import { formatBytes } from '@/utils/format';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const session = await requireAdminPage('settings:write');
  const settings = await getSiteSettings();
  const backend = rateLimitBackend();

  const facts: Array<{ label: string; value: string; warn?: boolean }> = [
    { label: 'Signed in as', value: `${session.email ?? 'unknown'} (${session.profile.role})` },
    { label: 'PDF upload limit', value: `${formatBytes(PDF_UPLOAD.maxBytes)}, application/pdf only, private bucket` },
    { label: 'Image upload limit', value: `${formatBytes(IMAGE_UPLOAD.maxBytes)}, JPG/PNG/WebP/AVIF/GIF (no SVG)` },
    { label: 'Signed URL lifetime', value: `${PDF_UPLOAD.signedUrlTtlSeconds} seconds` },
    {
      label: 'Rate limiting',
      value: backend === 'upstash' ? 'Upstash Redis (shared across instances)' : 'In-memory (per instance). Configure Upstash for production.',
      warn: backend !== 'upstash' && process.env.NODE_ENV === 'production',
    },
    { label: 'Email sign-in links', value: isMagicLinkEnabled() ? 'Enabled (accounts are never created)' : 'Disabled' },
    { label: 'Service role key', value: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configured (server only)' : 'Missing', warn: !process.env.SUPABASE_SERVICE_ROLE_KEY },
  ];

  return (
    <AdminPage title="Settings" description="Site-wide text and a read-only view of the security configuration.">
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <SettingsForm initial={settings} />
        <Panel title="Security and limits" description="Change these in the environment variables and Supabase.">
          <dl className="space-y-3 text-sm">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-muted">{fact.label}</dt>
                <dd className={fact.warn ? 'font-medium text-warning-700' : 'text-ink'}>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </AdminPage>
  );
}
