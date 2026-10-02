export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 120;

/**
 * "Understanding Hazard Ratio in Clinical Trials" → "understanding-hazard-ratio-in-clinical-trials".
 * Accents are folded ("Análise" → "analise"). Mirrors public.slugify() in the database.
 */
export function slugify(value: string, maxLength = SLUG_MAX_LENGTH): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

export function isValidSlug(value: string): boolean {
  return value.length > 0 && value.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(value);
}
