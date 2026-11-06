const { Pool } = require('pg');
const fs = require('fs');

let dbUrl = 'postgresql://mpsi_user:mpsi_secure_pwd@localhost:5432/mpsi_db?schema=public';
try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (match) dbUrl = match[1];
} catch (e) {}

const pool = new Pool({ connectionString: dbUrl });

async function testEmptyDate() {
  try {
    await pool.query(`
      INSERT INTO "MpsiMoldQuotation" (
        "QuotationSequenceNo", "QuotationID", "ProjectID", "EstimateNumber", "MoldVendorID",
        "TotalQuotationAmount", "SubmissionDate", "ConfirmedDate"
      ) VALUES (
        nextval('public."MpsiMoldQuotation_QuotationSequenceNo_seq"'),
        'DATE_TEST', 'PJT', 'EST', 'VENDOR', 0, '', ''
      )
    `);
    console.log("SUCCESS");
  } catch (err) {
    console.error("EXPECTED ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

testEmptyDate();

