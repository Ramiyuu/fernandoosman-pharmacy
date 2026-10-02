'use client';

import {
  FileText,
  Files,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Shapes,
  Tags,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ADMIN_NAV } from '@/config/site';
import { cn } from '@/utils/cn';

const ICONS: Record<(typeof ADMIN_NAV)[number]['icon'], LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  'file-text': FileText,
  'folder-kanban': FolderKanban,
  shapes: Shapes,
  tags: Tags,
  files: Files,
  inbox: Inbox,
  user: User,
  settings: Settings,
};

export function AdminNav({ onNavigate, newMessages = 0 }: { onNavigate?: () => void; newMessages?: number }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-0.5">
      {ADMIN_NAV.map((item) => {
        const Icon = ICONS[item.icon];
        const active = item.href === '/admin' ? pathname === '/admin' : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-navy-200 transition-colors hover:bg-navy-800 hover:text-white',
                active && 'bg-navy-800 text-white',
              )}
            >
              <Icon className={cn('size-4', active ? 'text-teal-200' : 'text-navy-200')} aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {item.href === '/admin/messages' && newMessages > 0 ? (
                <span className="rounded-sm bg-teal-500 px-1.5 text-xs font-medium text-white tabular" aria-label={`${newMessages} new`}>
                  {newMessages}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
