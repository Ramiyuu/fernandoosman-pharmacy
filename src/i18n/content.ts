import type {
  ArticleCard,
  ArticleFilterOptions,
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  LanguageSkill,
  SiteProfile,
  SiteSettings,
  SkillGroup,
  TaxonomyRef,
  TopicWithCount,
} from '@/types/content';

import type { Locale } from './config';

/**
 * Content written in the admin panel has an English base and optional
 * Portuguese fields. These helpers pick the visitor's language and fall back
 * to English whenever the Portuguese field is empty.
 */

export function pick(locale: Locale, base: string, portuguese: string | null | undefined): string {
  return locale === 'pt' && portuguese && portuguese.trim() ? portuguese : base;
}

function pickList(locale: Locale, base: string[], portuguese: string[] | null | undefined): string[] {
  return locale === 'pt' && portuguese && portuguese.length > 0 ? portuguese : base;
}

export function localizeTaxonomy<T extends TaxonomyRef>(item: T, locale: Locale): T {
  return { ...item, name: pick(locale, item.name, item.name_pt) };
}

export function localizeCard<T extends ArticleCard>(card: T, locale: Locale): T {
  return {
    ...card,
    category: card.category ? localizeTaxonomy(card.category, locale) : null,
    topics: card.topics.map((topic) => localizeTaxonomy(topic, locale)),
  };
}

export function localizeTopic(topic: TopicWithCount, locale: Locale): TopicWithCount {
  return {
    ...topic,
    name: pick(locale, topic.name, topic.name_pt),
    description: pick(locale, topic.description, topic.description_pt),
  };
}

export function localizeFilterOptions(options: ArticleFilterOptions, locale: Locale): ArticleFilterOptions {
  return {
    ...options,
    topics: options.topics.map((option) => ({ ...option, name: pick(locale, option.name, option.name_pt) })),
    categories: options.categories.map((option) => ({ ...option, name: pick(locale, option.name, option.name_pt) })),
  };
}

const localizeLanguage = (entry: LanguageSkill, locale: Locale): LanguageSkill => ({
  ...entry,
  name: pick(locale, entry.name, entry.name_pt),
  level: pick(locale, entry.level, entry.level_pt),
});

const localizeEducation = (entry: EducationEntry, locale: Locale): EducationEntry => ({
  ...entry,
  degree: pick(locale, entry.degree, entry.degree_pt),
  field: entry.field === undefined ? undefined : pick(locale, entry.field, entry.field_pt),
  activities: entry.activities === undefined ? undefined : pick(locale, entry.activities, entry.activities_pt),
  description: pick(locale, entry.description, entry.description_pt),
  start: pick(locale, entry.start, entry.start_pt),
  end: pick(locale, entry.end, entry.end_pt),
});

const localizeExperience = (entry: ExperienceEntry, locale: Locale): ExperienceEntry => ({
  ...entry,
  role: pick(locale, entry.role, entry.role_pt),
  employment_type:
    entry.employment_type === undefined ? undefined : pick(locale, entry.employment_type, entry.employment_type_pt),
  location: entry.location === undefined ? undefined : pick(locale, entry.location, entry.location_pt),
  skills: entry.skills === undefined ? undefined : pick(locale, entry.skills, entry.skills_pt),
  description: pick(locale, entry.description, entry.description_pt),
  start: pick(locale, entry.start, entry.start_pt),
  end: pick(locale, entry.end, entry.end_pt),
});

const localizeSkill = (group: SkillGroup, locale: Locale): SkillGroup => ({
  ...group,
  group: pick(locale, group.group, group.group_pt),
  items: pickList(locale, group.items, group.items_pt),
});

const localizeCertification = (entry: CertificationEntry, locale: Locale): CertificationEntry => ({
  ...entry,
  name: pick(locale, entry.name, entry.name_pt),
  description: entry.description === undefined ? undefined : pick(locale, entry.description, entry.description_pt),
  skills: entry.skills === undefined ? undefined : pick(locale, entry.skills, entry.skills_pt),
});

export function localizeProfile(profile: SiteProfile, locale: Locale): SiteProfile {
  if (locale === 'en') return profile;
  const pt = profile.translations?.pt ?? {};
  return {
    ...profile,
    headline: pick(locale, profile.headline, pt.headline),
    focus_areas: pickList(locale, profile.focus_areas, pt.focus_areas),
    short_bio: pick(locale, profile.short_bio, pt.short_bio),
    bio: pick(locale, profile.bio, pt.bio),
    course: pick(locale, profile.course, pt.course),
    university: pick(locale, profile.university, pt.university),
    location: pick(locale, profile.location, pt.location),
    expected_graduation: pick(locale, profile.expected_graduation, pt.expected_graduation),
    current_studies: pickList(locale, profile.current_studies, pt.current_studies),
    scientific_interests: pickList(locale, profile.scientific_interests, pt.scientific_interests),
    interests: pickList(locale, profile.interests, pt.interests),
    languages: profile.languages.map((entry) => localizeLanguage(entry, locale)),
    education: profile.education.map((entry) => localizeEducation(entry, locale)),
    experience: profile.experience.map((entry) => localizeExperience(entry, locale)),
    skills: profile.skills.map((group) => localizeSkill(group, locale)),
    certifications: profile.certifications.map((entry) => localizeCertification(entry, locale)),
  };
}

export function localizeSettings(settings: SiteSettings, locale: Locale): SiteSettings {
  if (locale === 'en') return settings;
  return {
    site: {
      ...settings.site,
      tagline: pick(locale, settings.site.tagline, settings.site.tagline_pt),
      description: pick(locale, settings.site.description, settings.site.description_pt),
    },
    contact: { ...settings.contact, intro: pick(locale, settings.contact.intro, settings.contact.intro_pt) },
  };
}
