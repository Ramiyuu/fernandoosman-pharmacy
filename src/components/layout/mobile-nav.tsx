'use client';

import { Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useState, type CSSProperties } from 'react';

import { Wordmark } from '@/components/brand/brand';
import { cn } from '@/utils/cn';

import { isActivePath, type NavItem } from './nav-links';

interface MobileNavProps {
  siteName: string;
  home: NavItem;
  items: NavItem[];
  search: NavItem;
  labels: { open: string; close: string; title: string; nav: string };
}

export function MobileNav({ siteName, home, items, search, labels }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        className="inline-flex size-10 items-center justify-center rounded-md text-navy-900 hover:bg-navy-50 lg:hidden"
        aria-label={labels.open}
      >
        <Menu className="size-5" aria-hidden="true" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-navy-950/40 lg:hidden" />
        <DialogPrimitive.Content className="mobile-drawer fixed inset-y-0 right-0 z-50 flex w-[min(20rem,85vw)] flex-col bg-white shadow-overlay focus:outline-none lg:hidden">
          <div className="flex h-16 items-center justify-between border-b border-rule px-4">
            <DialogPrimitive.Title asChild>
              <Wordmark name={siteName} as="h2" className="text-xs" />
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="inline-flex size-10 items-center justify-center rounded-md hover:bg-navy-50"
              aria-label={labels.close}
            >
              <X className="size-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">{labels.title}</DialogPrimitive.Description>
          <nav aria-label={labels.nav} className="flex-1 overflow-y-auto p-2">
            <ul className="flex flex-col">
              {[home, ...items, search].map((item, index) => {
                const active = item === home ? pathname === home.href : isActivePath(pathname, item.href);
                return (
                  <li key={item.href} className="mobile-drawer-item" style={{ '--i': index } as CSSProperties}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-3 text-base text-navy-900 hover:bg-navy-50',
                        active && 'bg-navy-50 font-medium',
                      )}
                    >
                      {item === search ? <Search className="size-4" aria-hidden="true" /> : null}
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
