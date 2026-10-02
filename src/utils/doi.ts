export const DOI_PATTERN = /^10\.\d{4,9}\/[^\s<>"]+$/;

/**
 * Accepts "10.1093/biostatistics/kxx069", "doi:10.1093/…" or a doi.org URL and
 * returns the bare DOI, or null if it is not a DOI.
 */
export function normalizeDoi(value: string | null | undefined): string | null {
  if (!value) return null;
  const doi = value
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '');
  return DOI_PATTERN.test(doi) && doi.length <= 255 ? doi : null;
}

export function doiUrl(doi: string): string {
  // DOI suffixes may contain characters with meaning in URLs (e.g. "#", "?").
  return `https://doi.org/${doi.split('/').map(encodeURIComponent).join('/')}`;
}

export function pubmedUrl(pmid: string): string | null {
  return /^\d{1,9}$/.test(pmid) ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : null;
}
