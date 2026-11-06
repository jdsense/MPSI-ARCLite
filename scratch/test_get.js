const { Pool } = require('pg');
const fs = require('fs');

let dbUrl = 'postgresql://mpsi_user:mpsi_secure_pwd@localhost:5432/mpsi_db?schema=public';
try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (match) dbUrl = match[1];
} catch (e) {}

const pool = new Pool({ connectionString: dbUrl });

async function check() {
  try {
    const res = await pool.query(`SELECT * FROM "MpsiMoldQuotation" ORDER BY "QuotationSequenceNo" DESC;`);
    console.log('DB ROWS COUNT:', res.rows.length);
    console.log('FIRST ROW:', res.rows[0]);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

check();

