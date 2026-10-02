'use client';

import { Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useState } from 'react';

import { PUBLIC_NAV } from '@/config/site';
import { cn } from '@/utils/cn';

import { isActivePath } from './nav-links';

export function MobileNav({ siteName }: { siteName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        className="inline-flex size-10 items-center justify-center rounded-md text-navy-900 hover:bg-navy-50 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" aria-hidden="true" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-navy-950/40 md:hidden" />
        <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(20rem,85vw)] flex-col bg-white shadow-overlay focus:outline-none md:hidden">
          <div className="flex h-16 items-center justify-between border-b border-rule px-4">
            <DialogPrimitive.Title className="font-semibold text-ink">{siteName}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="inline-flex size-10 items-center justify-center rounded-md hover:bg-navy-50"
              aria-label="Close menu"
            >
              <X className="size-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">Site navigation</DialogPrimitive.Description>
          <nav aria-label="Mobile" className="flex-1 overflow-y-auto p-2">
            <ul className="flex flex-col">
              {[{ href: '/', label: 'Home' }, ...PUBLIC_NAV, { href: '/search', label: 'Search' }].map((item) => {
                const active = item.href === '/' ? pathname === '/' : isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-3 text-base text-navy-900 hover:bg-navy-50',
                        active && 'bg-navy-50 font-medium',
                      )}
                    >
                      {item.href === '/search' ? <Search className="size-4" aria-hidden="true" /> : null}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
