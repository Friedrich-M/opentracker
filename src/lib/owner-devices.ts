/**
 * A device the owner marked as their own on a visitor label: an IP alone is
 * too broad (a campus or office address is shared), so a label names the
 * owner's devices at that IP by operating system and screen size. An app's
 * in-app browser keeps its own cookies, so the owner mark cannot reach it;
 * this can. Pure helpers, safe in the browser; the collection lookup is in
 * owner-device-visit.ts.
 */
export interface OwnerDevice {
  os: string;
  screen: string;
}

export const MAX_OWNER_DEVICES = 10;

/** The stored JSON as a clean list, whatever was saved. */
export function toOwnerDevices(value: unknown): OwnerDevice[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is OwnerDevice =>
        item && typeof item.os === 'string' && typeof item.screen === 'string',
    )
    .map(({ os, screen }) => ({ os, screen }));
}

export function isOwnerDevice(devices: OwnerDevice[], os?: string | null, screen?: string | null) {
  return Boolean(os && screen) && devices.some(d => d.os === os && d.screen === screen);
}
