// Database types for supabase-js, mirroring supabase/migrations.
// Regenerate against a real project with:
//   npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.types.ts
// (JSON-returning RPCs are typed precisely in src/types/content.ts.)

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
  | 'contact_deleted';

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

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string;
  role: AppRole | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

type TopicRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
};

type TagRow = {
  id: string;
  name: string;
  slug: string;
  created_at: Timestamp;
};

type ArticleRow = {
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

type ArticleReferenceRow = {
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

type ArticleFileRow = {
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

type MediaFileRow = {
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

type ProjectRow = {
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

type SiteProfileRow = {
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

type SettingRow = {
  key: string;
  value: Json;
  is_public: boolean;
  updated_at: Timestamp;
  updated_by: string | null;
};

type ActivityLogRow = {
  id: number;
  actor_id: string | null;
  action: ActivityAction;
  entity_type: ActivityEntityType | null;
  entity_id: string | null;
  summary: string;
  metadata: Json;
  created_at: Timestamp;
};

type ContactRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'archived';
  created_at: Timestamp;
};

/** Builds the Insert/Update shapes: generated or defaulted columns become optional. */
type Writable<Row, Required extends keyof Row, Omitted extends keyof Row = never> = Pick<
  Row,
  Exclude<Required, Omitted>
> &
  Partial<Omit<Row, Required | Omitted>>;

type TableDef<Row, Required extends keyof Row, Omitted extends keyof Row = never> = {
  Row: Row;
  Insert: Writable<Row, Required, Omitted>;
  Update: Partial<Omit<Row, Omitted>>;
  Relationships: [];
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
  public: {
    Tables: {
      profiles: TableDef<ProfileRow, 'id'>;
      topics: TableDef<TopicRow, 'name' | 'slug'>;
      categories: TableDef<CategoryRow, 'name' | 'slug'>;
      tags: TableDef<TagRow, 'name' | 'slug'>;
      articles: TableDef<ArticleRow, 'slug', 'search_vector'>;
      article_topics: TableDef<{ article_id: string; topic_id: string }, 'article_id' | 'topic_id'>;
      article_tags: TableDef<{ article_id: string; tag_id: string }, 'article_id' | 'tag_id'>;
      article_references: TableDef<ArticleReferenceRow, 'article_id' | 'title'>;
      article_files: TableDef<
        ArticleFileRow,
        'original_filename' | 'internal_name' | 'storage_path' | 'size_bytes'
      >;
      media_files: TableDef<
        MediaFileRow,
        'bucket' | 'storage_path' | 'original_filename' | 'mime_type' | 'size_bytes'
      >;
      projects: TableDef<ProjectRow, 'title' | 'slug', 'search_vector'>;
      project_tags: TableDef<{ project_id: string; tag_id: string }, 'project_id' | 'tag_id'>;
      site_profile: TableDef<SiteProfileRow, never>;
      settings: TableDef<SettingRow, 'key' | 'value'>;
      activity_logs: TableDef<ActivityLogRow, 'action', 'id'>;
      contacts: TableDef<ContactRow, 'name' | 'email' | 'message'>;
    };
    Views: {
      public_authors: {
        Row: { id: string; display_name: string };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      current_user_role: { Args: Record<string, never>; Returns: AppRole | null };
      slugify: { Args: { p_value: string }; Returns: string };
      article_card_json: { Args: { p_article_id: string }; Returns: Json };
      article_detail_json: {
        Args: { p_article_id: string; p_include_private_files?: boolean };
        Returns: Json;
      };
      get_article_by_slug: { Args: { p_slug: string }; Returns: Json };
      get_published_articles: {
        Args: {
          p_topic?: string;
          p_category?: string;
          p_tag?: string;
          p_language?: string;
          p_year?: number;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Json;
      };
      get_featured_article: { Args: Record<string, never>; Returns: Json };
      get_article_filter_options: { Args: Record<string, never>; Returns: Json };
      get_topics_with_counts: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          name: string;
          slug: string;
          description: string;
          icon: string;
          sort_order: number;
          article_count: number;
        }[];
      };
      get_public_metrics: { Args: Record<string, never>; Returns: Json };
      project_card_json: { Args: { p_project_id: string }; Returns: Json };
      get_published_projects: { Args: { p_limit?: number; p_offset?: number }; Returns: Json };
      get_project_by_slug: { Args: { p_slug: string }; Returns: Json };
      search_content: { Args: { p_query: string; p_limit?: number; p_offset?: number }; Returns: Json };
      get_sitemap_entries: { Args: Record<string, never>; Returns: Json };
      admin_save_article: {
        Args: {
          p_id: string | null;
          p_data: Json;
          p_topic_ids?: string[];
          p_tag_names?: string[];
          p_references?: Json;
        };
        Returns: Json;
      };
      admin_save_project: {
        Args: { p_id: string | null; p_data: Json; p_tag_names?: string[] };
        Returns: Json;
      };
      admin_dashboard_stats: { Args: Record<string, never>; Returns: Json };
      admin_list_files: {
        Args: { p_kind?: string; p_limit?: number; p_offset?: number };
        Returns: Json;
      };
      admin_tag_usage: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          article_count: number;
          project_count: number;
        }[];
      };
    };
    Enums: {
      app_role: AppRole;
      content_status: ContentStatus;
      project_progress: ProjectProgress;
      file_visibility: FileVisibility;
      file_status: FileStatus;
      file_kind: FileKind;
      activity_action: ActivityAction;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
