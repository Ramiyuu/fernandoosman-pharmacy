import { describe, expect, it } from 'vitest';

import { safeExternalUrl, safeHref, safeRedirectPath } from './url';

describe('safeHref', () => {
  it.each([
    ['https://doi.org/10.1000/xyz', 'https://doi.org/10.1000/xyz'],
    ['http://example.com', 'http://example.com/'],
    ['mailto:someone@example.com', 'mailto:someone@example.com'],
    ['/articles/hazard-ratio', '/articles/hazard-ratio'],
    ['#ref-1', '#ref-1'],
  ])('allows %s', (input, expected) => {
    expect(safeHref(input)).toBe(expected);
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'java\tscript:alert(1)',
    ' javascript:alert(1)',
    'jav&#x09;ascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'vbscript:msgbox(1)',
    '//evil.example.com',
    '/\\evil.example.com',
    'file:///etc/passwd',
    '',
    42,
    null,
  ])('rejects %s', (input) => {
    expect(safeHref(input)).toBeNull();
  });
});

describe('safeExternalUrl', () => {
  it('accepts only absolute http(s) URLs', () => {
    expect(safeExternalUrl('https://linkedin.com/in/x')).toBe('https://linkedin.com/in/x');
    expect(safeExternalUrl('/relative')).toBeNull();
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('mailto:a@b.co')).toBeNull();
  });
});

describe('safeRedirectPath (open redirect protection)', () => {
  it.each([
    ['/admin/articles', '/admin/articles'],
    ['/admin', '/admin'],
    ['/preview/articles/123?x=1', '/preview/articles/123?x=1'],
  ])('keeps internal admin path %s', (input, expected) => {
    expect(safeRedirectPath(input, '/admin')).toBe(expected);
  });

  it.each([
    'https://evil.example.com',
    '//evil.example.com',
    '/\\evil.example.com',
    '/%2F%2Fevil.example.com',
    '/articles',
    '/admin/login',
    '/adminx',
    'javascript:alert(1)',
    '/admin/\tfoo',
    undefined,
    '',
  ])('falls back for %s', (input) => {
    expect(safeRedirectPath(input, '/admin')).toBe('/admin');
  });
});
