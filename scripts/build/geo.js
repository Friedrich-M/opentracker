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

// Download handler for compressed tar.gz files
const downloadCompressed = url =>
  new Promise(resolve => {
    https.get(url, res => {
      resolve(res.pipe(zlib.createGunzip({})).pipe(list()));
    });
  });

// Download handler for direct .mmdb files
const downloadDirect = (url, originalUrl) =>
  new Promise((resolve, reject) => {
    https.get(url, res => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadDirect(res.headers.location, originalUrl || url)
          .then(resolve)
          .catch(reject);
        return;
      }

      const filename = path.join(dest, path.basename(originalUrl || url));
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
    });
  });

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
