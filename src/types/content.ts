// Shapes returned by the JSON RPC functions in supabase/migrations/*_rpc.sql.
import type { RichTextDoc } from '@/lib/content/rich-text';

import type { ContentStatus, FileVisibility, ProjectProgress } from './database.types';

export type Language = 'en' | 'pt';
export const LANGUAGES: readonly Language[] = ['en', 'pt'];

export interface TaxonomyRef {
  id: string;
  name: string;
  slug: string;
}

export interface TopicRef extends TaxonomyRef {
  icon: string;
}

export interface ArticleCard {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  excerpt: string;
  cover_image_path: string | null;
  cover_image_alt: string;
  language: Language;
  reading_time: number;
  status: ContentStatus;
  featured: boolean;
  published_at: string | null;
  updated_at: string;
  author_name: string | null;
  category: TaxonomyRef | null;
  topics: TopicRef[];
  tags: TaxonomyRef[];
}

export interface ArticleReference {
  id?: string;
  title: string;
  authors: string;
  journal: string;
  year: number | null;
  doi: string | null;
  url: string | null;
  pmid: string | null;
}

export interface ArticleAttachment {
  id: string;
  original_filename: string;
  label: string;
  size_bytes: number;
  visibility: FileVisibility;
}

export interface ArticleDetail extends ArticleCard {
  content: RichTextDoc;
  doi: string | null;
  external_url: string | null;
  seo_title: string;
  seo_description: string;
  created_at: string;
  deleted_at: string | null;
  references: ArticleReference[];
  files: ArticleAttachment[];
  translation: { slug: string; title: string; language: Language } | null;
  related: ArticleCard[];
}

export interface Paginated<T> {
  total: number;
  items: T[];
}

export interface FacetOption {
  name: string;
  slug: string;
  count: number;
}

export interface ArticleFilterOptions {
  years: number[];
  languages: Language[];
  categories: FacetOption[];
  topics: FacetOption[];
  tags: FacetOption[];
}

export interface ArticleFilters {
  topic?: string;
  category?: string;
  tag?: string;
  language?: Language;
  year?: number;
}

export interface TopicWithCount {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
  article_count: number;
}

export interface PublicMetrics {
  articles_published: number;
  paper_reviews: number;
  research_notes: number;
  topics_covered: number;
  data_projects: number;
  references_reviewed: number;
  latest_publication: { title: string; slug: string; published_at: string } | null;
  current_semester: number | null;
  total_semesters: number | null;
}

export interface ProjectLink {
  label: string;
  url: string;
}

export interface ProjectImage {
  path: string;
  alt: string;
}

export interface ProjectCard {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: ContentStatus;
  progress: ProjectProgress;
  cover_image_path: string | null;
  cover_image_alt: string;
  technologies: string[];
  repository_url: string | null;
  live_url: string | null;
  started_on: string | null;
  completed_on: string | null;
  featured: boolean;
  published_at: string | null;
  updated_at: string;
  tags: TaxonomyRef[];
}

export interface ProjectDetail extends ProjectCard {
  content: RichTextDoc;
  gallery: ProjectImage[];
  links: ProjectLink[];
}

export interface SearchHit extends ArticleCard {
  headline: string;
  rank: number;
}

export interface SearchResults {
  total: number;
  items: SearchHit[];
  projects: ProjectCard[];
}

export interface LanguageSkill {
  name: string;
  level: string;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  start: string;
  end: string;
  description: string;
}

export interface ExperienceEntry {
  organization: string;
  role: string;
  start: string;
  end: string;
  description: string;
}

export interface SkillGroup {
  group: string;
  items: string[];
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  year: string;
  url: string;
}

export interface SiteProfile {
  full_name: string;
  headline: string;
  focus_areas: string[];
  short_bio: string;
  bio: string;
  photo_path: string | null;
  course: string;
  university: string;
  current_semester: number | null;
  total_semesters: number | null;
  location: string;
  languages: LanguageSkill[];
  interests: string[];
  linkedin_url: string | null;
  github_url: string | null;
  lattes_url: string | null;
  orcid_url: string | null;
  professional_email: string | null;
  cv_file_id: string | null;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: SkillGroup[];
  certifications: CertificationEntry[];
  updated_at: string;
}

export interface SiteSettings {
  site: {
    name: string;
    tagline: string;
    description: string;
    keywords: string[];
  };
  contact: {
    intro: string;
  };
}

export interface SitemapEntries {
  articles: Array<{ slug: string; updated_at: string }>;
  projects: Array<{ slug: string; updated_at: string }>;
  topics: Array<{ slug: string; updated_at: string }>;
}
