import { useEffect, useRef, useState } from 'react';
import styles from './VisitorMap.module.css';

const TILE = 256;
const HEIGHT = 240;
const TILE_URL = 'https://tile.openstreetmap.org';

/** Web-Mercator zoom that keeps an accuracy radius (km) readable on the map. */
function zoomForRadius(radiusKm: number | null) {
  const r = radiusKm ?? 50;
  if (r <= 2) return 13;
  if (r <= 10) return 11;
  if (r <= 25) return 10;
  if (r <= 60) return 9;
  if (r <= 150) return 8;
  if (r <= 400) return 6;
  return 4;
}

/** Pixel position of a coordinate in the whole world map at `zoom`. */
function worldPixel(latitude: number, longitude: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const lat = (Math.max(-85, Math.min(85, latitude)) * Math.PI) / 180;

  return {
    x: ((longitude + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * scale,
  };
}

/**
 * The visitor's approximate place: OpenStreetMap tiles around the IP's
 * coordinates, a point, and a circle for MaxMind's accuracy radius — IP
 * location is city-level, so the circle says how far to trust the point.
 * Plain tiles, no map library; the owner's browser fetches them.
 */
export function VisitorMap({
  latitude,
  longitude,
  accuracyRadius,
  caption,
}: {
  latitude: number;
  longitude: number;
  accuracyRadius: number | null;
  caption?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const zoom = zoomForRadius(accuracyRadius);
  const center = worldPixel(latitude, longitude, zoom);
  const left = center.x - width / 2;
  const top = center.y - HEIGHT / 2;
  const count = 2 ** zoom;
  const tiles: { key: string; src: string; x: number; y: number }[] = [];

  if (width > 0) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + HEIGHT) / TILE); ty++) {
      if (ty < 0 || ty >= count) continue;
      for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
        const wrapped = ((tx % count) + count) % count;
        tiles.push({
          key: `${tx}-${ty}`,
          src: `${TILE_URL}/${zoom}/${wrapped}/${ty}.png`,
          x: tx * TILE - left,
          y: ty * TILE - top,
        });
      }
    }
  }

  const metersPerPixel = (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;
  const radiusPx = accuracyRadius
    ? Math.min((accuracyRadius * 1000) / metersPerPixel, HEIGHT * 0.45)
    : 0;

  return (
    <div ref={ref} className={styles.map} role="img" aria-label={caption}>
      {tiles.map(tile => (
        <img
          key={tile.key}
          className={styles.tile}
          src={tile.src}
          alt=""
          style={{ left: tile.x, top: tile.y }}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ))}
      {width > 0 && radiusPx > 6 && (
        <span
          className={styles.area}
          style={{ left: width / 2, top: HEIGHT / 2, width: radiusPx * 2, height: radiusPx * 2 }}
        />
      )}
      {width > 0 && <span className={styles.point} style={{ left: width / 2, top: HEIGHT / 2 }} />}
      {caption && <span className={styles.caption}>{caption}</span>}
      <span className={styles.attribution}>
        ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>{' '}
        contributors
      </span>
    </div>
  );
}
