import { describe, expect, it } from 'vitest';

import { getExtension, hasBlockedExtension, sanitizeDisplayFilename } from './filename';
import { normalizeDoi } from './doi';
import { slugify } from './slugify';

describe('sanitizeDisplayFilename', () => {
  it('strips directories (path traversal) and control characters', () => {
    expect(sanitizeDisplayFilename('../../etc/passwd.pdf')).toBe('passwd.pdf');
    expect(sanitizeDisplayFilename('C:\\Users\\x\\report.pdf')).toBe('report.pdf');
    expect(sanitizeDisplayFilename('evil\u202Efdp.exe')).toBe('evilfdp.exe');
    expect(sanitizeDisplayFilename('a\u0000b.pdf')).toBe('ab.pdf');
  });

  it('replaces reserved characters and removes leading dots', () => {
    expect(sanitizeDisplayFilename('..hidden<script>.pdf')).toBe('hidden_script_.pdf');
  });

  it('falls back when nothing usable remains', () => {
    expect(sanitizeDisplayFilename('../../')).toBe('document.pdf');
  });

  it('limits length but keeps the extension', () => {
    const name = sanitizeDisplayFilename(`${'a'.repeat(400)}.pdf`);
    expect(name.length).toBeLessThanOrEqual(180);
    expect(name.endsWith('.pdf')).toBe(true);
  });
});

describe('blocked extensions', () => {
  it.each(['malware.exe', 'script.js', 'page.html', 'image.svg', 'shell.php', 'run.sh', 'x.bat', 'x.cmd', 'x.scr', 'x.jar', 'report.exe.pdf', 'page.HTML.pdf'])(
    'blocks %s',
    (name) => {
      expect(hasBlockedExtension(name)).toBe(true);
    },
  );

  it('accepts plain PDFs', () => {
    expect(hasBlockedExtension('Clinical trial results 2024.pdf')).toBe(false);
    expect(getExtension('Paper.PDF')).toBe('pdf');
  });
});

describe('slugify', () => {
  it('builds clean slugs', () => {
    expect(slugify('Understanding Hazard Ratio in Clinical Trials')).toBe('understanding-hazard-ratio-in-clinical-trials');
    expect(slugify('Análise de Sobrevida: Kaplan–Meier')).toBe('analise-de-sobrevida-kaplan-meier');
    expect(slugify('  --What Does a 95% CI Mean?--  ')).toBe('what-does-a-95-ci-mean');
  });
});

describe('normalizeDoi', () => {
  it('accepts bare DOIs, doi: prefixes and doi.org URLs', () => {
    expect(normalizeDoi('10.1093/biostatistics/kxx069')).toBe('10.1093/biostatistics/kxx069');
    expect(normalizeDoi('doi:10.1136/bmj.c332')).toBe('10.1136/bmj.c332');
    expect(normalizeDoi('https://doi.org/10.1056/NEJM198806303182605')).toBe('10.1056/NEJM198806303182605');
  });

  it('rejects anything else', () => {
    expect(normalizeDoi('not a doi')).toBeNull();
    expect(normalizeDoi('10.1/x')).toBeNull();
    expect(normalizeDoi('10.1000/<script>')).toBeNull();
  });
});
