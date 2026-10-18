/* eslint-disable no-console */
import 'dotenv/config';

function checkMissing(vars) {
  const missing = vars.reduce((arr, key) => {
    if (!process.env[key]) {
      arr.push(key);
    }
    return arr;
  }, []);

  if (missing.length) {
    console.log(`The following environment variables are not defined:`);
    for (const item of missing) {
      console.log(' - ', item);
    }
    process.exit(1);
  }
}

if (!process.env.SKIP_DB_CHECK) {
  checkMissing(['DATABASE_URL']);
}

// Without APP_SECRET tokens are signed with a hash of DATABASE_URL, which is
// fine for a disposable local database but not for a production instance.
if (process.env.NODE_ENV === 'production') {
  checkMissing(['APP_SECRET']);
}

// Half a replay store config would quietly put replays back in Postgres.
if (!!process.env.REPLAY_STORE_URL !== !!process.env.REPLAY_STORE_SECRET) {
  checkMissing(['REPLAY_STORE_URL', 'REPLAY_STORE_SECRET']);
}
