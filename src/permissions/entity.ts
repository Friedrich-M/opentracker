import type { Auth } from '@/lib/types';
import { canDeleteWebsite, canUpdateWebsite } from './website';

// Shares are the only entity-scoped records, and every share belongs to a
// website, so entity access is website ownership (or admin).
export async function canViewEntity(auth: Auth, entityId: string) {
  return canUpdateWebsite(auth, entityId);
}

export async function canUpdateEntity(auth: Auth, entityId: string) {
  return canUpdateWebsite(auth, entityId);
}

export async function canDeleteEntity(auth: Auth, entityId: string) {
  return canDeleteWebsite(auth, entityId);
}
