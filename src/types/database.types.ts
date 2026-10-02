// Row and enum types mirroring db/migrations (snake_case, as returned by
// src/lib/db/client.ts: timestamptz → ISO string, date → 'YYYY-MM-DD').
// JSON-returning functions are typed precisely in src/types/content.ts.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamp = string;

export type AppRole = 'admin' | 'editor';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type ProjectProgress = 'planned' | 'in_progress' | 'completed';
export type FileVisibility = 'public' | 'private';
export type FileStatus = 'pending' | 'ready' | 'failed';
export type FileKind = 'article_attachment' | 'cv';
export type ActivityAction =
  | 'login'
  | 'logout'
  | 'article_created'
  | 'article_updated'
  | 'article_published'
  | 'article_unpublished'
  | 'article_archived'
  | 'article_deleted'
  | 'article_restored'
  | 'article_purged'
  | 'pdf_uploaded'
  | 'pdf_deleted'
  | 'image_uploaded'
  | 'image_deleted'
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'taxonomy_updated'
  | 'profile_updated'
  | 'settings_updated'
  | 'cv_updated'
  | 'contact_deleted'
  | 'two_factor_enabled'
  | 'backup_codes_regenerated'
  | 'password_changed'
  | 'sessions_revoked';

export type ActivityEntityType =
  | 'article'
  | 'project'
  | 'file'
  | 'image'
  | 'topic'
  | 'category'
  | 'tag'
  | 'profile'
  | 'settings'
  | 'auth'
  | 'contact';

export type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string;
  role: AppRole | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type TopicRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type TagRow = {
  id: string;
  name: string;
  slug: string;
  created_at: Timestamp;
};

export type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  excerpt: string;
  content: Json;
  content_text: string;
  cover_image_path: string | null;
  cover_image_alt: string;
  status: ContentStatus;
  featured: boolean;
  language: string;
  translation_of_article_id: string | null;
  category_id: string | null;
  doi: string | null;
  external_url: string | null;
  seo_title: string;
  seo_description: string;
  reading_time: number;
  author_id: string | null;
  published_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null;
  search_vector: unknown;
};

export type ArticleReferenceRow = {
  id: string;
  article_id: string;
  position: number;
  title: string;
  authors: string;
  journal: string;
  year: number | null;
  doi: string | null;
  url: string | null;
  pmid: string | null;
  created_at: Timestamp;
};

export type ArticleFileRow = {
  id: string;
  article_id: string | null;
  kind: FileKind;
  original_filename: string;
  internal_name: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  label: string;
  visibility: FileVisibility;
  status: FileStatus;
  uploaded_by: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type MediaFileRow = {
  id: string;
  bucket: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  uploaded_by: string | null;
  created_at: Timestamp;
};

export type ProjectRow = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: Json;
  content_text: string;
  status: ContentStatus;
  progress: ProjectProgress;
  cover_image_path: string | null;
  cover_image_alt: string;
  gallery: Json;
  repository_url: string | null;
  live_url: string | null;
  links: Json;
  technologies: string[];
  started_on: string | null;
  completed_on: string | null;
  featured: boolean;
  sort_order: number;
  author_id: string | null;
  published_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  search_vector: unknown;
};

export type SiteProfileRow = {
  id: number;
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
  languages: Json;
  interests: string[];
  linkedin_url: string | null;
  github_url: string | null;
  lattes_url: string | null;
  orcid_url: string | null;
  professional_email: string | null;
  cv_file_id: string | null;
  education: Json;
  experience: Json;
  skills: Json;
  certifications: Json;
  updated_at: Timestamp;
  updated_by: string | null;
};

export type SettingRow = {
  key: string;
  value: Json;
  is_public: boolean;
  updated_at: Timestamp;
  updated_by: string | null;
};

export type ActivityLogRow = {
  id: number;
  actor_id: string | null;
  action: ActivityAction;
  entity_type: ActivityEntityType | null;
  entity_id: string | null;
  summary: string;
  metadata: Json;
  created_at: Timestamp;
};

export type ContactRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'archived';
  consented_at: Timestamp;
  created_at: Timestamp;
};
