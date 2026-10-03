import { describe, expect, it } from 'vitest';

import type { SiteProfile } from '@/types/content';

import { localizeProfile, localizeTopic } from './content';
import { en } from './dictionaries/en';
import { pt } from './dictionaries/pt';

const profile = {
  full_name: 'Fernando Osman',
  headline: 'Pharmacy Student',
  focus_areas: ['Clinical Research'],
  short_bio: 'English bio.',
  bio: '',
  course: 'Pharmacy',
  university: 'University',
  location: 'Brazil',
  expected_graduation: '',
  current_studies: [],
  scientific_interests: [],
  interests: ['Oncology'],
  languages: [{ name: 'Portuguese', level: 'Native', name_pt: 'Português', level_pt: 'Nativo' }],
  education: [{ institution: 'X', degree: 'Pharmacy', degree_pt: 'Farmácia', start: '2023', end: 'Expected 2028', description: '' }],
  experience: [],
  skills: [{ group: 'Data', items: ['R'], items_pt: [] }],
  certifications: [],
  translations: { pt: { headline: 'Estudante de Farmácia', short_bio: '', focus_areas: ['Pesquisa Clínica'] } },
} as unknown as SiteProfile;

describe('content localisation', () => {
  it('uses Portuguese fields on /pt and falls back to English when empty', () => {
    const localized = localizeProfile(profile, 'pt');
    expect(localized.headline).toBe('Estudante de Farmácia');
    expect(localized.short_bio).toBe('English bio.');
    expect(localized.focus_areas).toEqual(['Pesquisa Clínica']);
    expect(localized.languages[0]).toMatchObject({ name: 'Português', level: 'Nativo' });
    expect(localized.education[0]).toMatchObject({ degree: 'Farmácia', end: 'Expected 2028' });
    expect(localized.skills[0].items).toEqual(['R']);
  });

  it('leaves English untouched', () => {
    expect(localizeProfile(profile, 'en')).toBe(profile);
  });

  it('localises topic names', () => {
    const topic = { id: '1', name: 'Pharmacology', name_pt: 'Farmacologia', slug: 'p', description: 'D', description_pt: '', icon: 'pill', sort_order: 0, article_count: 1 };
    expect(localizeTopic(topic, 'pt')).toMatchObject({ name: 'Farmacologia', description: 'D' });
    expect(localizeTopic(topic, 'en').name).toBe('Pharmacology');
  });
});

describe('dictionaries', () => {
  /** Every key in en.ts has a non-empty Portuguese counterpart of the same kind. */
  function compare(a: unknown, b: unknown, path: string) {
    expect(typeof b, path).toBe(typeof a);
    if (typeof a === 'string') expect((b as string).trim().length, path).toBeGreaterThan(0);
    if (a && typeof a === 'object') {
      for (const key of Object.keys(a)) compare((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`);
    }
  }

  it('cover the same keys in both languages', () => {
    compare(en, pt, 'dictionary');
  });
});
