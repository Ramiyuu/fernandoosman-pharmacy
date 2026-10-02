import type { Metadata } from 'next';

import { contactRetentionDays, describeRetention } from '@/config/privacy';
import { IMAGE_UPLOAD, PDF_UPLOAD } from '@/config/uploads';
import { AdminPage, Panel } from '@/features/admin/components/admin-page';
import { SettingsForm } from '@/features/settings/components/settings-form';
import { requireAdminPage } from '@/lib/auth/session';
import { siteUrl } from '@/lib/public-env';
import { getSiteSettings } from '@/services/public-content.service';
import { formatBytes } from '@/utils/format';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const session = await requireAdminPage('settings:write');
  const settings = await getSiteSettings();
  const https = siteUrl().startsWith('https://');

  const facts: Array<{ label: string; value: string; warn?: boolean }> = [
    { label: 'Signed in as', value: `${session.email ?? 'unknown'} (${session.profile.role}, two-factor on)` },
    { label: 'PDF upload limit', value: `${formatBytes(PDF_UPLOAD.maxBytes)}, application/pdf only, checked before storage` },
    { label: 'Image upload limit', value: `${formatBytes(IMAGE_UPLOAD.maxBytes)}, JPG/PNG/WebP/AVIF/GIF (no SVG)` },
    { label: 'File storage', value: 'Private Cloudflare R2 bucket' },
    { label: 'PDF link lifetime', value: `${PDF_UPLOAD.signedUrlTtlSeconds} seconds (signed, never stored)` },
    { label: 'Rate limiting', value: 'Stored in the database, shared by every instance' },
    { label: 'Contact messages kept for', value: describeRetention(contactRetentionDays()) },
    { label: 'HTTPS', value: https ? 'Yes (secure cookies, HSTS)' : 'No: set NEXT_PUBLIC_SITE_URL to the https:// address', warn: !https && process.env.NODE_ENV === 'production' },
  ];

  return (
    <AdminPage title="Settings" description="Site-wide text and a read-only view of the security configuration.">
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <SettingsForm initial={settings} />
        <Panel title="Security and limits" description="Change these in the environment variables on Railway.">
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
