import { publicImageUrl } from '@/lib/storage/public-url';
import type { ArticleDetail, ProjectDetail, SiteProfile } from '@/types/content';
import { doiUrl } from '@/utils/doi';
import { safeExternalUrl } from '@/utils/url';

import { absoluteUrl } from './metadata';

export function personJsonLd(profile: SiteProfile) {
  const sameAs = [profile.linkedin_url, profile.github_url, profile.lattes_url, profile.orcid_url]
    .map(safeExternalUrl)
    .filter((url): url is string => Boolean(url));
  const photo = publicImageUrl('profile-images', profile.photo_path);

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': absoluteUrl('/about#person'),
    name: profile.full_name,
    jobTitle: profile.headline || undefined,
    description: profile.short_bio || undefined,
    url: absoluteUrl('/about'),
    image: photo ? absoluteUrl(photo) : undefined,
    email: profile.professional_email ? `mailto:${profile.professional_email}` : undefined,
    knowsAbout: profile.interests.length > 0 ? profile.interests : undefined,
    knowsLanguage: profile.languages.map((language) => language.name),
    alumniOf: profile.university ? { '@type': 'CollegeOrUniversity', name: profile.university } : undefined,
    address: profile.location ? { '@type': 'PostalAddress', addressCountry: profile.location } : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}

export function articleJsonLd(article: ArticleDetail, authorName: string) {
  const image = publicImageUrl('article-images', article.cover_image_path);
  return {
    '@context': 'https://schema.org',
    '@type': article.references.length > 0 ? 'ScholarlyArticle' : 'Article',
    headline: article.title,
    alternativeHeadline: article.subtitle || undefined,
    description: article.seo_description || article.excerpt,
    inLanguage: article.language === 'pt' ? 'pt-BR' : 'en',
    datePublished: article.published_at ?? undefined,
    dateModified: article.updated_at,
    mainEntityOfPage: absoluteUrl(`/articles/${article.slug}`),
    url: absoluteUrl(`/articles/${article.slug}`),
    image: image ? [absoluteUrl(image)] : [absoluteUrl(`/articles/${article.slug}/opengraph-image`)],
    author: { '@type': 'Person', name: authorName, url: absoluteUrl('/about') },
    publisher: { '@type': 'Person', name: authorName, url: absoluteUrl('/') },
    articleSection: article.category?.name,
    keywords: article.tags.map((tag) => tag.name).join(', ') || undefined,
    timeRequired: `PT${article.reading_time}M`,
    citation: article.references.length
      ? article.references.map((reference) => ({
          '@type': 'CreativeWork',
          name: reference.title,
          url: reference.doi ? doiUrl(reference.doi) : (safeExternalUrl(reference.url) ?? undefined),
        }))
      : undefined,
  };
}

export function projectJsonLd(project: ProjectDetail, authorName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: project.summary,
    url: absoluteUrl(`/projects/${project.slug}`),
    author: { '@type': 'Person', name: authorName },
    dateCreated: project.started_on ?? undefined,
    keywords: [...project.technologies, ...project.tags.map((tag) => tag.name)].join(', ') || undefined,
    codeRepository: safeExternalUrl(project.repository_url) ?? undefined,
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function websiteJsonLd(name: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    description,
    url: absoluteUrl('/'),
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${absoluteUrl('/search')}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}
