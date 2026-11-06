const { Pool } = require('pg');
const fs = require('fs');

let dbUrl = 'postgresql://mpsi_user:mpsi_secure_pwd@localhost:5432/mpsi_db?schema=public';
try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (match) dbUrl = match[1];
} catch (e) {}

const pool = new Pool({ connectionString: dbUrl });

async function checkRows() {
  try {
    const res = await pool.query(`SELECT "QuotationSequenceNo", "QuotationID", "ProjectID", "QuotationStatus" FROM "MpsiMoldQuotation";`);
    console.log('ALL ROWS:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkRows();

