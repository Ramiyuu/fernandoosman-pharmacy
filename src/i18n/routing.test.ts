import { describe, expect, it } from 'vitest';

import { negotiateLocale } from './config';
import { internalPathFromUnprefixed, localizePath, resolvePublicPath, switchLocalePath } from './routing';

describe('localised URLs', () => {
  it('builds public URLs from internal paths', () => {
    expect(localizePath('en', '/')).toBe('/en');
    expect(localizePath('pt', '/')).toBe('/pt');
    expect(localizePath('pt', '/articles/hazard-ratio')).toBe('/pt/artigos/hazard-ratio');
    expect(localizePath('pt', '/articles?tag=hr&page=2')).toBe('/pt/artigos?tag=hr&page=2');
    expect(localizePath('pt', '/search?q=risk')).toBe('/pt/busca?q=risk');
    expect(localizePath('en', '/topics/biostatistics')).toBe('/en/topics/biostatistics');
  });

  it('maps prefixed paths back to route folders and finds the canonical spelling', () => {
    expect(resolvePublicPath('/pt/artigos/x')).toEqual({
      locale: 'pt',
      internal: '/pt/articles/x',
      canonical: '/pt/artigos/x',
    });
    expect(resolvePublicPath('/pt/articles/x')?.canonical).toBe('/pt/artigos/x');
    expect(resolvePublicPath('/en/artigos/x')?.canonical).toBe('/en/articles/x');
    expect(resolvePublicPath('/en')).toEqual({ locale: 'en', internal: '/en', canonical: '/en' });
    expect(resolvePublicPath('/pt/opengraph-image')?.internal).toBe('/pt/opengraph-image');
    expect(resolvePublicPath('/articles/x')).toBeNull();
    expect(resolvePublicPath('/admin')).toBeNull();
  });

  it('reads old unprefixed links in either language', () => {
    expect(internalPathFromUnprefixed('/')).toBe('/');
    expect(internalPathFromUnprefixed('/articles/x')).toBe('/articles/x');
    expect(internalPathFromUnprefixed('/sobre')).toBe('/about');
  });

  it('switches the same page to the other language', () => {
    expect(switchLocalePath('/en/articles', 'pt')).toBe('/pt/artigos');
    expect(switchLocalePath('/pt/contato', 'en')).toBe('/en/contact');
    expect(switchLocalePath('/pt', 'en')).toBe('/en');
    expect(switchLocalePath('/pt/busca?q=x', 'en')).toBe('/en/search?q=x');
  });
});

describe('Accept-Language negotiation', () => {
  it('picks the first supported language by preference', () => {
    expect(negotiateLocale('pt-BR,pt;q=0.9,en;q=0.8')).toBe('pt');
    expect(negotiateLocale('en-US,en;q=0.9')).toBe('en');
    expect(negotiateLocale('fr-FR,pt;q=0.5,en;q=0.7')).toBe('en');
    expect(negotiateLocale('es;q=1')).toBeNull();
    expect(negotiateLocale(null)).toBeNull();
  });
});
