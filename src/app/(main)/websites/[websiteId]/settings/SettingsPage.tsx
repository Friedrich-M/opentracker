'use client';
import { WebsiteSettingsPage } from '@/app/(main)/websites/[websiteId]/settings/WebsiteSettingsPage';

export function SettingsPage({ websiteId }: { websiteId: string }) {
  return <WebsiteSettingsPage websiteId={websiteId} />;
}
