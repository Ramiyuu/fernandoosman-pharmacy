// Shapes returned by the JSON functions in db/migrations/0007_public_rpc.sql.
import type { RichTextDoc } from '@/lib/content/rich-text';

import type { ContentStatus, FileVisibility, ProjectProgress } from './database.types';

export type Language = 'en' | 'pt';
export const LANGUAGES: readonly Language[] = ['en', 'pt'];

export interface TaxonomyRef {
  id: string;
  name: string;
  /** Portuguese name; empty means "use name". Topics and categories only. */
  name_pt?: string;
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
  /** Id of the first version; every language version of a text shares it. */
  translation_group: string;
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
  volume?: string;
  issue?: string;
  pages?: string;
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
  pmid: string | null;
  og_image_path: string | null;
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
  name_pt?: string;
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
  name_pt: string;
  slug: string;
  description: string;
  description_pt: string;
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
  language: Language;
  translation_group: string;
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
  translation: { slug: string; title: string; language: Language } | null;
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
  name_pt?: string;
  level_pt?: string;
}

export interface EducationEntry {
  field?: string;
  activities?: string;
  visible?: boolean;
  order?: number;
  current?: boolean;
  logo?: string | null;
  institution: string;
  degree: string;
  start: string;
  end: string;
  description: string;
  degree_pt?: string;
  field_pt?: string;
  activities_pt?: string;
  description_pt?: string;
  start_pt?: string;
  end_pt?: string;
}

export interface ExperienceEntry {
  employment_type?: string;
  location?: string;
  skills?: string;
  visible?: boolean;
  order?: number;
  current?: boolean;
  logo?: string | null;
  organization: string;
  role: string;
  start: string;
  end: string;
  description: string;
  role_pt?: string;
  employment_type_pt?: string;
  location_pt?: string;
  skills_pt?: string;
  description_pt?: string;
  start_pt?: string;
  end_pt?: string;
}

export interface SkillGroup {
  group: string;
  items: string[];
  group_pt?: string;
  items_pt?: string[];
}

export interface CertificationEntry {
  visible?: boolean;
  issue_date?: string;
  expiration_date?: string;
  credential_id?: string;
  description?: string;
  skills?: string;
  image_path?: string | null;
  pdf_file_id?: string | null;
  name: string;
  issuer: string;
  year: string;
  url: string;
  name_pt?: string;
  description_pt?: string;
  skills_pt?: string;
}

/** Portuguese versions of the profile's top-level text (site_profile.translations.pt). */
export interface ProfileTranslation {
  headline?: string;
  focus_areas?: string[];
  short_bio?: string;
  bio?: string;
  course?: string;
  university?: string;
  location?: string;
  expected_graduation?: string;
  current_studies?: string[];
  scientific_interests?: string[];
  interests?: string[];
}

export interface SiteProfile {
  expected_graduation: string;
  current_studies: string[];
  scientific_interests: string[];
  website_url: string | null;
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
  translations: { pt?: ProfileTranslation };
  updated_at: string;
}

export interface SiteSettings {
  site: {
    name: string;
    tagline: string;
    description: string;
    keywords: string[];
    /** Portuguese versions; empty means "use the English text". */
    tagline_pt?: string;
    description_pt?: string;
  };
  contact: {
    intro: string;
    intro_pt?: string;
  };
}

export interface SitemapEntry {
  slug: string;
  updated_at: string;
  language: Language;
  group: string;
}

export interface SitemapEntries {
  articles: SitemapEntry[];
  projects: SitemapEntry[];
  topics: Array<{ slug: string; updated_at: string }>;
}
