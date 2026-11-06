const { Pool } = require('pg');
const fs = require('fs');

let dbUrl = 'postgresql://mpsi_user:mpsi_secure_pwd@localhost:5432/mpsi_db?schema=public';
try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (match) dbUrl = match[1];
} catch (e) {}

const pool = new Pool({ connectionString: dbUrl });

async function cleanTestRows() {
  try {
    await pool.query(`DELETE FROM "MpsiMoldQuotation" WHERE "QuotationID" IN ('M-EST-2026-008', 'M-EST-2026-009', 'TEST-EST-001');`);
    const res = await pool.query(`SELECT "QuotationSequenceNo", "QuotationID", "ProjectID" FROM "MpsiMoldQuotation" ORDER BY "QuotationSequenceNo" ASC;`);
    console.log('CURRENT CLEAN DB ROWS:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

cleanTestRows();

