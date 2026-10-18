'use client';
import type { ReactNode } from 'react';
import { PageBody } from '@/components/common/PageBody';
import { useLoginQuery } from '@/components/hooks';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = useLoginQuery();

  if (!user.isAdmin) {
    return null;
  }

  return <PageBody>{children}</PageBody>;
}
