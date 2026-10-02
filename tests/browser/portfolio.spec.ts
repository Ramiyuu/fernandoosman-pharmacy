import { test, expect } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { AwsV4Signer } from 'aws4fetch';

const admin = { email: 'admin@portfolio.test', password: 'local-admin-test-password' };
function totp(secret: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of secret.replace(/\s/g, '')) bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac('sha1', key).update(counter).digest();
  const offset = digest[19] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
}
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
test.describe.serial('real portfolio flows', () => {
  test('admin is protected; password, mandatory TOTP and logout work', async ({ page, request }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
    expect(
      (
        await request.post('/api/admin/uploads/pdf?target=cv', { headers: { origin: 'http://localhost:3000' } })
      ).status(),
    ).toBe(401);
    await page.getByLabel('Email', { exact: true }).fill(admin.email);
    await page.getByLabel('Password', { exact: true }).fill(admin.password);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.waitForURL(/\/admin\/security/);
    await page.goto('/admin/profile');
    await expect(page).toHaveURL(/\/admin\/security/);
    await page.getByLabel('Password', { exact: true }).fill(admin.password);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByText('2. Add this site to your authenticator app')).toBeVisible();
    const secret = (await page.locator('p.tracking-wider').innerText()).replace(/\s/g, '');
    mkdirSync('.e2e', { recursive: true });
    writeFileSync('.e2e/totp', secret);
    await page.getByLabel('I saved my backup codes somewhere safe.').check();
    await page.getByLabel('6-digit code from the app').fill(totp(secret));
    await page.getByRole('button', { name: 'Turn on two-factor authentication' }).click();
    await page.waitForURL(/\/admin$/);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL(/\/admin\/login/);
    await page.getByLabel('Email', { exact: true }).fill(admin.email);
    await page.getByLabel('Password', { exact: true }).fill(admin.password);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByText('Open your authenticator app', { exact: false })).toBeVisible();
    await page.getByLabel('Authentication code', { exact: true }).fill(totp(secret));
    await page.getByRole('button', { name: /verify|sign in|continue/i }).click();
    await page.waitForURL(/\/admin$/);
    await page.context().storageState({ path: '.e2e/browser-admin.json' });
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name.includes('session_token'))?.httpOnly).toBe(true);
  });
  test('profile, education, experience, certificates and PDF publication', async ({ browser, request }) => {
    const context = await browser.newContext({ storageState: '.e2e/browser-admin.json' });
    const page = await context.newPage();
    await page.goto('/admin/profile');
    await page.getByLabel('Expected graduation', { exact: true }).fill('2028');
    await page.getByRole('button', { name: 'Add education', exact: true }).click();
    await page.getByLabel('Institution', { exact: true }).last().fill('Test University');
    await page.getByLabel('Degree', { exact: true }).last().fill('Pharmacy');
    await page.getByRole('button', { name: 'Add experience', exact: true }).click();
    await page.getByLabel('Organisation', { exact: true }).last().fill('Test Research Group');
    await page.getByLabel('Role', { exact: true }).last().fill('Student researcher');
    await page.getByRole('button', { name: 'Add certification', exact: true }).click();
    await page.getByLabel('Certification', { exact: true }).last().fill('Test methods certificate');
    await page.getByLabel('Issuer', { exact: true }).last().fill('Test issuer');
    const response = await context.request.post('/api/admin/uploads/pdf?target=resource', {
      headers: { origin: 'http://localhost:3000' },
      multipart: { file: { name: 'certificate.pdf', mimeType: 'application/pdf', buffer: pdf } },
    });
    expect(response.status(), await response.text()).toBe(201);
    const file = await response.json();
    writeFileSync('.e2e/certificate-id', file.id);
    expect((await request.get(`/api/files/${file.id}`, { maxRedirects: 0 })).status()).toBe(404);
    // Exercise the upload widget, not just the handler.
    await page
      .getByLabel('Attach PDF', { exact: false })
      .last()
      .setInputFiles({ name: 'certificate-ui.pdf', mimeType: 'application/pdf', buffer: pdf });
    await expect(page.getByRole('link', { name: 'Preview PDF', exact: true }).last()).toBeVisible();
    const href = await page.getByRole('link', { name: 'Preview PDF', exact: true }).last().getAttribute('href');
    writeFileSync('.e2e/certificate-id', href!.split('/').pop()!);
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect(page.getByText('Profile saved.', { exact: true })).toBeVisible();
    await page.goto('/certificates');
    await expect(page.getByRole('heading', { name: 'Test methods certificate' })).toBeVisible();
    await page.goto('/experience');
    await expect(page.getByText('Test University', { exact: true })).toBeVisible();
    await expect(page.getByText('Student researcher', { exact: true })).toBeVisible();
    await page.goto('/admin/profile');
    await page.getByLabel('Degree', { exact: true }).last().fill('Pharmacy degree');
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect(page.getByText('Profile saved.', { exact: true })).toBeVisible();
    await context.close();
  });
  test('PDF/image validation, signed links, expiry and separate analytics', async ({ browser, request }) => {
    const context = await browser.newContext({ storageState: '.e2e/browser-admin.json' });
    const invalid = await context.request.post('/api/admin/uploads/pdf?target=cv', {
      headers: { origin: 'http://localhost:3000' },
      multipart: { file: { name: 'bad.pdf', mimeType: 'application/pdf', buffer: Buffer.from('<html>bad</html>') } },
    });
    expect(invalid.status()).toBe(415);
    const cross = await context.request.post('/api/admin/uploads/pdf?target=cv', {
      headers: { origin: 'https://attacker.test' },
    });
    expect(cross.status()).toBe(403);
    const png = readFileSync('public/brand/fo-icon.png');
    const img = await context.request.post('/api/admin/uploads/image?bucket=profile', {
      headers: { origin: 'http://localhost:3000' },
      multipart: { file: { name: 'portrait.png', mimeType: 'image/png', buffer: png } },
    });
    expect(img.status(), await img.text()).toBe(201);
    const id = readFileSync('.e2e/certificate-id', 'utf8');
    const view = await request.get(`/api/files/${id}`, { maxRedirects: 0 });
    expect(view.status(), await view.text()).toBe(302);
    const download = await request.get(`/api/files/${id}?download=1`, { maxRedirects: 0 });
    expect(download.status()).toBe(302);
    const signed = download.headers().location;
    expect(new URL(signed).searchParams.get('X-Amz-Expires')).toBe('60');
    const object = await request.get(signed);
    expect(object.status()).toBe(200);
    expect(object.headers()['content-disposition']).toContain('attachment');
    const old = new Date(Date.now() - 120000).toISOString().replace(/[:-]|\.\d{3}/g, '');
    const unsigned = new URL(signed);
    for (const key of [...unsigned.searchParams.keys()])
      if (key.startsWith('X-Amz-') && key !== 'X-Amz-Expires') unsigned.searchParams.delete(key);
    const expired = await new AwsV4Signer({
      url: unsigned.toString(),
      method: 'GET',
      accessKeyId: 'e2e0000000000000000000000000000a',
      secretAccessKey: 'e2e-only-secret-access-key-0000000000000000000000000000000000000',
      region: 'auto',
      service: 's3',
      datetime: old,
      signQuery: true,
    }).sign();
    expect((await request.get(expired.url.toString())).status()).toBe(403);
    const page = await context.newPage();
    await page.goto('/admin/analytics');
    await expect(page.getByRole('heading', { name: 'Analytics & downloads', exact: true })).toBeVisible();
    await expect(page.getByText('certificate-ui.pdf').first()).toBeVisible();
    await context.close();
  });
  test('article create, edit, publish, unpublish, PDF and video draft protection', async ({ browser, request }) => {
    const context = await browser.newContext({ storageState: '.e2e/browser-admin.json' });
    const page = await context.newPage();
    await page.goto('/admin/articles/new');
    await page.getByLabel('Title', { exact: true }).fill('End to end research note');
    await page
      .getByLabel('Summary', { exact: true })
      .fill('A reproducible test of the scientific publishing workflow.');
    await page
      .getByRole('textbox', { name: 'Article content', exact: true })
      .fill(
        'This is a scientific article used only in the isolated test database. It discusses clinical evidence, statistical methods, and reproducible results in pharmacy. '.repeat(
          4,
        ),
      );
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.waitForURL(/\/admin\/articles\/[a-f0-9-]{36}$/);
    const id = page.url().split('/').pop()!;
    writeFileSync('.e2e/article-id', id);
    const attachmentResponse = await context.request.post(`/api/admin/uploads/pdf?target=article&articleId=${id}`, {
      headers: { origin: 'http://localhost:3000' },
      multipart: { file: { name: 'article-study.pdf', mimeType: 'application/pdf', buffer: pdf } },
    });
    expect(attachmentResponse.status(), await attachmentResponse.text()).toBe(201);
    const attachment = await attachmentResponse.json();
    await page.reload();
    await page.getByRole('button', { name: 'Make public', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Make private', exact: true })).toBeVisible();
    expect((await request.get(`/api/files/${attachment.id}`, { maxRedirects: 0 })).status()).toBe(404);
    const bytes = Buffer.from(
      await page.evaluate(async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#0B1F44';
        ctx.fillRect(0, 0, 64, 64);
        const stream = canvas.captureStream(10);
        const chunks: Blob[] = [];
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const done = new Promise<Blob>((resolve) => {
          recorder.ondataavailable = (e) => chunks.push(e.data);
          recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
        });
        recorder.start();
        await new Promise((resolve) => setTimeout(resolve, 250));
        recorder.stop();
        const blob = await done;
        stream.getTracks().forEach((track) => track.stop());
        return Array.from(new Uint8Array(await blob.arrayBuffer()));
      }),
    );
    const start = await context.request.post('/api/admin/uploads/video', {
      headers: { origin: 'http://localhost:3000' },
      data: { action: 'start', filename: 'test.webm', mime: 'video/webm', size: bytes.length, articleId: id },
    });
    expect(start.status(), await start.text()).toBe(201);
    const upload = await start.json();
    const put = await request.put(upload.url, { headers: { 'content-type': 'video/webm' }, data: bytes });
    expect(put.status(), await put.text()).toBe(200);
    const complete = await context.request.post('/api/admin/uploads/video', {
      headers: { origin: 'http://localhost:3000' },
      data: { action: 'complete', id: upload.id },
    });
    expect(complete.status(), await complete.text()).toBe(200);
    expect((await request.get(`/api/videos/${upload.id}`, { maxRedirects: 0 })).status()).toBe(404);
    expect(
      await page.evaluate(async (src) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = src;
        return await new Promise<number>((resolve, reject) => {
          video.onloadedmetadata = () => resolve(video.videoWidth);
          video.onerror = () => reject(new Error('Video could not decode'));
        });
      }, `/api/videos/${upload.id}`),
    ).toBe(64);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Unpublish', exact: true })).toBeVisible();
    expect((await request.get(`/api/videos/${upload.id}`, { maxRedirects: 0 })).status()).toBe(307);
    expect((await request.get(`/api/files/${attachment.id}`, { maxRedirects: 0 })).status()).toBe(302);
    await page.getByLabel('Title', { exact: true }).fill('End to end research note revised');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByText('Saved', { exact: false }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Unpublish', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Unpublish', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeVisible();
    expect((await request.get(`/api/videos/${upload.id}`, { maxRedirects: 0 })).status()).toBe(404);
    expect((await request.get(`/api/files/${attachment.id}`, { maxRedirects: 0 })).status()).toBe(404);
    expect((await request.get('/articles/end-to-end-research-note-revised')).status()).toBe(404);
    await context.close();
  });
  test('responsive public pages and admin at all requested widths', async ({ browser }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext({ storageState: '.e2e/browser-admin.json', reducedMotion: 'reduce' });
    const page = await context.newPage();
    const routes = [
      '/',
      '/articles',
      '/articles/understanding-hazard-ratio',
      '/about',
      '/certificates',
      '/experience',
      '/projects',
      '/admin',
      '/admin/profile',
      '/admin/files',
      '/admin/analytics',
      '/admin/articles/new',
      '/topics',
      '/cv',
      '/contact',
      '/search?q=clinical',
      '/privacy',
      '/admin/articles',
      '/admin/projects',
      '/admin/projects/new',
      '/admin/topics',
      '/admin/tags',
      '/admin/audit',
      '/admin/messages',
      '/admin/security',
      '/admin/settings',
      '/admin/files?tab=images',
    ];
    // Discover an actual article slug, so fixtures and real routing stay aligned.
    await page.goto('/articles');
    routes[2] = (await page.locator('article h2 a').first().getAttribute('href')) ?? '/articles';
    await page.goto('/projects');
    const projectHref = await page.locator('article h3 a').first().getAttribute('href');
    if (projectHref) routes.push(projectHref);
    await page.goto('/topics');
    const topicHref = await page.locator('h2 a').first().getAttribute('href');
    if (topicHref) routes.push(topicHref);
    mkdirSync('test-results/visual', { recursive: true });
    for (const width of [1440, 1280, 1024, 768, 430, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of routes) {
        const response = await page.goto(route);
        expect(response?.status(), `${width} ${route}`).toBe(200);
        await expect(page.locator('h1').first()).toBeVisible();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          `${width} ${route} horizontal overflow`,
        ).toBe(true);
        await page.screenshot({
          path: `test-results/visual/${width}-${route.replace(/[^a-z0-9]/gi, '_') || 'home'}.png`,
          fullPage: true,
          animations: 'disabled',
        });
      }
    }
    await page.goto('/');
    await page.getByRole('button', { name: /open menu/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await context.close();
  });
  test('education, experience and certificate records can be removed', async ({ browser, request }) => {
    const context = await browser.newContext({ storageState: '.e2e/browser-admin.json' });
    const page = await context.newPage();
    await page.goto('/admin/profile');
    await page.getByLabel('Organisation', { exact: true }).last().fill('Updated test research group');
    await page.getByLabel('Certification', { exact: true }).last().fill('Updated test certificate');
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect(page.getByText('Profile saved.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Organisation', { exact: true }).last()).toHaveValue('Updated test research group');
    await expect(page.getByLabel('Certification', { exact: true }).last()).toHaveValue('Updated test certificate');
    for (const label of ['Organisation', 'Institution']) {
      await page
        .getByLabel(label, { exact: true })
        .last()
        .locator('xpath=ancestor::div[.//button[normalize-space()="Remove"]][1]')
        .getByRole('button', { name: 'Remove', exact: true })
        .click();
    }
    await page.getByRole('button', { name: 'Remove certification', exact: true }).last().click();
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect(page.getByText('Profile saved.', { exact: true })).toBeVisible();
    await page.goto('/experience');
    await expect(page.getByText('Test University', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Updated test research group', { exact: true })).toHaveCount(0);
    await page.goto('/certificates');
    await expect(page.getByRole('heading', { name: 'Updated test certificate' })).toHaveCount(0);
    const id = readFileSync('.e2e/certificate-id', 'utf8');
    expect((await request.get(`/api/files/${id}`, { maxRedirects: 0 })).status()).toBe(404);
    await context.close();
  });
});
