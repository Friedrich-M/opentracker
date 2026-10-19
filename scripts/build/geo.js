/* eslint-disable no-console */
import 'dotenv/config';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import zlib from 'node:zlib';
import { list } from 'tar';

if (process.env.SKIP_BUILD_GEO) {
  console.log('SKIP_BUILD_GEO is set. Skipping geo setup.');
  process.exit(0);
}

if (process.env.VERCEL && !process.env.BUILD_GEO) {
  console.log('Vercel environment detected. Skipping geo setup.');
  process.exit(0);
}

// GeoLite2-City gives country/region/city; GeoLite2-ASN gives the network
// organisation (ISP or institution) shown on each session.
const databases = [
  { db: 'GeoLite2-City', customUrl: process.env.GEO_DATABASE_URL },
  { db: 'GeoLite2-ASN', customUrl: process.env.GEO_ASN_DATABASE_URL },
];

function getUrl({ db, customUrl }) {
  if (customUrl) {
    return customUrl;
  }

  if (process.env.MAXMIND_LICENSE_KEY) {
    return (
      `https://download.maxmind.com/app/geoip_download` +
      `?edition_id=${db}&license_key=${process.env.MAXMIND_LICENSE_KEY}&suffix=tar.gz`
    );
  }

  return `https://raw.githubusercontent.com/GitSquared/node-geolite2-redist/master/redist/${db}.tar.gz`;
}

const dest = path.resolve(process.cwd(), 'geo');

if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest);
}

// GET a URL, following redirects (MaxMind's download URL redirects to its
// storage), and fail on any other non-200 answer instead of unpacking an
// error page.
const get = (url, redirects = 5) =>
  new Promise((resolve, reject) => {
    https
      .get(url, res => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();

          if (!redirects) {
            reject(new Error(`Too many redirects downloading ${new URL(url).host}`));
            return;
          }

          get(new URL(res.headers.location, url).toString(), redirects - 1).then(resolve, reject);
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          // The host only: a MaxMind URL carries the license key.
          reject(new Error(`HTTP ${res.statusCode} downloading from ${new URL(url).host}`));
          return;
        }

        resolve(res);
      })
      .on('error', reject);
  });

// Download handler for compressed tar.gz files
const downloadCompressed = url =>
  get(url).then(res => res.pipe(zlib.createGunzip({})).pipe(list()));

// Download handler for direct .mmdb files
const downloadDirect = url =>
  get(url).then(
    res =>
      new Promise((resolve, reject) => {
        const filename = path.join(dest, path.basename(new URL(url).pathname));
        const fileStream = fs.createWriteStream(filename);

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          console.log('Saved geo database:', filename);
          resolve();
        });

        fileStream.on('error', e => {
          reject(e);
        });
      }),
  );

// Download one database, as a direct .mmdb file or a tar.gz archive
const download = url => {
  if (url.endsWith('.mmdb')) {
    return downloadDirect(url);
  }

  return downloadCompressed(url).then(
    res =>
      new Promise((resolve, reject) => {
        res.on('entry', entry => {
          if (entry.path.endsWith('.mmdb')) {
            const filename = path.join(dest, path.basename(entry.path));
            entry.pipe(fs.createWriteStream(filename));

            console.log('Saved geo database:', filename);
          }
        });

        res.on('error', e => {
          reject(e);
        });
        res.on('finish', () => {
          resolve();
        });
      }),
  );
};

for (const database of databases) {
  try {
    await download(getUrl(database));
  } catch (e) {
    console.error(`Failed to download ${database.db}:`, e);
    process.exit(1);
  }
}
