import { getItem, removeItem } from '@/lib/storage';

const RETURN_URL = 'tracker.return-url';

/** Only same-origin relative paths are accepted to prevent open redirects. */
function isSafeReturnUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\') &&
    !/[\r\n]/.test(value)
  );
}

export function consumeReturnUrl(): string | null {
  const value = getItem(RETURN_URL, true);

  removeItem(RETURN_URL, true);

  return isSafeReturnUrl(value) ? value : null;
}
