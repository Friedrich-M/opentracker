import { getRandomDevice } from '../distributions/devices.js';
import { getRandomGeo, getRandomLanguage } from '../distributions/geographic.js';
import { generateTimestampForDay } from '../distributions/temporal.js';
import { uuid } from '../utils.js';

export interface SessionData {
  id: string;
  websiteId: string;
  browser: string;
  os: string;
  device: string;
  screen: string;
  language: string;
  country: string;
  region: string;
  city: string;
  createdAt: Date;
}

export function createSession(websiteId: string, day: Date): SessionData {
  const deviceInfo = getRandomDevice();
  const geo = getRandomGeo();
  const language = getRandomLanguage();
  const createdAt = generateTimestampForDay(day);

  return {
    id: uuid(),
    websiteId,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    device: deviceInfo.device,
    screen: deviceInfo.screen,
    language,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    createdAt,
  };
}

export function createSessions(websiteId: string, day: Date, count: number): SessionData[] {
  const sessions: SessionData[] = [];
  // Today's sessions stop at the current time, so the demo never shows
  // visits that have not happened yet.
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const session = createSession(websiteId, day);

    if (session.createdAt.getTime() <= now) {
      sessions.push(session);
    }
  }

  // Sort by createdAt to maintain chronological order
  sessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return sessions;
}
