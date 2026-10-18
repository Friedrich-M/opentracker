import { uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';

interface HeatmapEventRow {
  websiteId: string;
  sessionId: string;
  visitId: string;
  urlPath: string;
  eventType: number;
  x: number | null;
  y: number | null;
  pageX: number | null;
  pageY: number | null;
  pageW: number | null;
  viewportW: number | null;
  viewportH: number | null;
  pageH: number | null;
  scrollPct: number | null;
  createdAt: Date;
}

export async function saveHeatmapEvents(rows: HeatmapEventRow[]) {
  if (!rows?.length) return;

  const normalizedRows = rows.map(r => ({
    ...r,
    x: toInt(r.x),
    y: toInt(r.y),
    pageX: toInt(r.pageX),
    pageY: toInt(r.pageY),
    pageW: toInt(r.pageW),
    viewportW: toInt(r.viewportW),
    viewportH: toInt(r.viewportH),
    pageH: toInt(r.pageH),
    scrollPct: toScrollPct(r.scrollPct),
  }));

  return relationalQuery(normalizedRows);
}

function toInt(value: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

function toScrollPct(value: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

async function relationalQuery(rows: HeatmapEventRow[]) {
  return prisma.client.heatmapEvent.createMany({
    data: rows.map(r => ({
      id: uuid(),
      websiteId: r.websiteId,
      sessionId: r.sessionId,
      visitId: r.visitId,
      urlPath: r.urlPath,
      eventType: r.eventType,
      x: r.x,
      y: r.y,
      pageX: r.pageX,
      pageY: r.pageY,
      pageW: r.pageW,
      viewportW: r.viewportW,
      viewportH: r.viewportH,
      pageH: r.pageH,
      scrollPct: r.scrollPct,
      createdAt: r.createdAt,
    })) as any,
  });
}
