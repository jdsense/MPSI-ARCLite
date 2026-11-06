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
    const constraints = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = '"MpsiMoldQuotation"'::regclass;
    `);
    console.log('CONSTRAINTS:', constraints.rows);

    const count = await pool.query(`SELECT count(*) FROM "MpsiMoldQuotation"`);
    console.log('COUNT:', count.rows);

    const seq = await pool.query(`
      SELECT pg_get_serial_sequence('"MpsiMoldQuotation"', 'QuotationSequenceNo')
    `);
    console.log('SEQUENCE:', seq.rows);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await pool.end();
  }
}

check();

