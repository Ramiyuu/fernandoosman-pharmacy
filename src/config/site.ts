export const PUBLIC_NAV = [
  { href: '/articles', label: 'Articles' },
  { href: '/topics', label: 'Topics' },
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
  { href: '/cv', label: 'CV' },
  { href: '/contact', label: 'Contact' },
] as const;

export const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: 'layout-dashboard' },
  { href: '/admin/articles', label: 'Articles', icon: 'file-text' },
  { href: '/admin/projects', label: 'Projects', icon: 'folder-kanban' },
  { href: '/admin/topics', label: 'Topics & categories', icon: 'shapes' },
  { href: '/admin/tags', label: 'Tags', icon: 'tags' },
  { href: '/admin/files', label: 'Files', icon: 'files' },
  { href: '/admin/messages', label: 'Messages', icon: 'inbox' },
  { href: '/admin/profile', label: 'Profile & CV', icon: 'user' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings' },
] as const;

/** Public pages are regenerated at most every 5 minutes, and immediately after admin changes. */
export const PUBLIC_REVALIDATE_SECONDS = 300;
