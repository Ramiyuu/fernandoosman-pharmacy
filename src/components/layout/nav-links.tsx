'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { PUBLIC_NAV } from '@/config/site';
import { cn } from '@/utils/cn';

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks() {
  const pathname = usePathname();
  return (
    <ul className="hidden items-center gap-1 md:flex">
      {PUBLIC_NAV.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative rounded-md px-3 py-2 text-[0.9375rem] text-navy-800 transition-colors hover:text-ink',
                active && 'text-ink after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:bg-teal-500',
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
