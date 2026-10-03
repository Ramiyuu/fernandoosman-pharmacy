'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/utils/cn';

export interface NavItem {
  href: string;
  label: string;
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <ul className="hidden items-center gap-1 lg:flex">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn('nav-link relative rounded-md px-3 py-2 text-[0.9375rem] text-navy-800 transition-colors hover:text-ink', active && 'text-ink')}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
