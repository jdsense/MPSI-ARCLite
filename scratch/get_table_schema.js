const { Pool } = require('pg');
const fs = require('fs');

// Read DATABASE_URL from .env.local
let dbUrl = 'postgresql://mpsi_user:mpsi_secure_pwd@localhost:5432/mpsi_db?schema=public';
try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (match) dbUrl = match[1];
} catch (e) {}

const pool = new Pool({ connectionString: dbUrl });

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'MpsiMoldQuotation' 
      ORDER BY ordinal_position
    `);
    console.log('COLUMNS_START');
    console.log(JSON.stringify(res.rows, null, 2));
    console.log('COLUMNS_END');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await pool.end();
  }
}

check();

