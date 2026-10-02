'use client';

import { ExternalLink, LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useState, type ReactNode } from 'react';

import { BrandIcon } from '@/components/brand/brand';
import { signOutAction } from '@/features/auth/actions';

import { AdminNav } from './admin-nav';

interface AdminShellProps {
  userName: string;
  userEmail: string | null;
  newMessages: number;
  children: ReactNode;
}

function SidebarContent({
  userName,
  userEmail,
  newMessages,
  onNavigate,
}: Omit<AdminShellProps, 'children'> & { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-navy-800 px-5">
        <BrandIcon size={30} />
        <span className="text-sm font-semibold tracking-tight text-white">FO / Studio</span>
      </div>
      <nav aria-label="Admin" className="flex-1 overflow-y-auto p-3">
        <AdminNav onNavigate={onNavigate} newMessages={newMessages} />
      </nav>
      <div className="border-t border-navy-800 p-4">
        <Link href="/" target="_blank" className="mb-3 flex items-center gap-2 text-sm text-navy-200 hover:text-white">
          <ExternalLink className="size-4" aria-hidden="true" /> View site
        </Link>
        <p className="truncate text-sm font-medium text-white">{userName}</p>
        {userEmail ? <p className="truncate text-xs text-navy-200">{userEmail}</p> : null}
        <form action={signOutAction} className="mt-3">
          <button type="submit" className="flex items-center gap-2 text-sm text-navy-200 hover:text-white">
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminShell({ children, ...user }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-mist lg:grid lg:grid-cols-[15rem_1fr]">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-md bg-white px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh bg-navy-950 lg:block">
        <SidebarContent {...user} />
      </aside>

      <div className="flex h-14 items-center justify-between border-b border-rule bg-navy-950 px-4 lg:hidden">
        <span className="flex items-center gap-2.5">
          <BrandIcon size={28} />
          <span className="text-sm font-semibold tracking-tight text-white">FO / Studio</span>
        </span>
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Trigger
            className="inline-flex size-10 items-center justify-center rounded-md text-white"
            aria-label="Open admin menu"
          >
            <Menu className="size-5" aria-hidden="true" />
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-navy-950/50" />
            <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-64 bg-navy-950 focus:outline-none">
              <DialogPrimitive.Title className="sr-only">Admin menu</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">Navigate the admin panel</DialogPrimitive.Description>
              <DialogPrimitive.Close
                className="absolute top-3 right-3 rounded-md p-2 text-white"
                aria-label="Close menu"
              >
                <X className="size-5" aria-hidden="true" />
              </DialogPrimitive.Close>
              <SidebarContent {...user} onNavigate={() => setOpen(false)} />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>

      <main id="admin-main" tabIndex={-1} className="min-w-0 focus:outline-none">
        {children}
      </main>
    </div>
  );
}
