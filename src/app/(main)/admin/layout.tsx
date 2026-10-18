import type { Metadata } from 'next';
import { AdminLayout } from './AdminLayout';

export default function ({ children }) {
  return <AdminLayout>{children}</AdminLayout>;
}

export const metadata: Metadata = {
  title: {
    template: '%s | Admin | OpenTracker',
    default: 'Admin | OpenTracker',
  },
};
