const zlib = require('zlib');
const { Pool } = require('pg');

let pool;

function getDatabaseUrl() {
  return global.KEITH_SESSION_DATABASE_URL || process.env.KEITH_SESSION_DATABASE_URL || '';
}

function getPool() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error('KEITH_SESSION_DATABASE_URL is not configured. Add the read-only Supabase PostgreSQL URL to the bot environment.');
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000
    });
  }
  return pool;
}

async function loadSessionByCode(code) {
  if (!/^[A-Za-z0-9]{6,32}$/.test(code)) {
    throw new Error('Invalid KEITH session code.');
  }

  let rows;
  try {
    ({ rows } = await getPool().query(
      `SELECT session_data
         FROM sessions
        WHERE session_code = $1
          AND status = 'active'
        LIMIT 1`,
      [code]
    ));
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      throw new Error('Supabase database host could not be resolved. Use the IPv4 Session pooler URL from Supabase Connect, not the direct db.<project>.supabase.co URL.');
    }
    throw error;
  }

  if (!rows.length || !rows[0].session_data) {
    throw new Error('The session code was not found or is disabled.');
  }

  try {
    return zlib.gunzipSync(Buffer.from(rows[0].session_data, 'base64'));
  } catch (error) {
    throw new Error(`Stored session data is invalid: ${error.message}`);
  }
}

module.exports = { loadSessionByCode };
