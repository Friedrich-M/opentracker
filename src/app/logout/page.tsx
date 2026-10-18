import type { Metadata } from 'next';
import { LogoutPage } from './LogoutPage';

export const dynamic = 'force-dynamic';

export default function () {
  return <LogoutPage />;
}

export const metadata: Metadata = {
  title: 'Logout',
};
