const { Pool } = require('pg');
const fs = require('fs');

let dbUrl = 'postgresql://mpsi_user:mpsi_secure_pwd@localhost:5432/mpsi_db?schema=public';
try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (match) dbUrl = match[1];
} catch (e) {}

const pool = new Pool({ connectionString: dbUrl });

async function testInsert() {
  try {
    const insertSql = `
      INSERT INTO "MpsiMoldQuotation" (
        "QuotationSequenceNo",
        "QuotationID",
        "ProjectID",
        "EstimateNumber",
        "MoldVendorID",
        "MaterialCost",
        "MachiningCost",
        "DesignCost",
        "ManagementCost",
        "TotalQuotationAmount",
        "FinalNegotiatedAmount",
        "TargetMoldDays",
        "QuotationStatus",
        "SubmissionDate",
        "CreatorID",
        "Note"
      ) VALUES (
        nextval('public."MpsiMoldQuotation_QuotationSequenceNo_seq"'),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      ON CONFLICT ("QuotationID") DO UPDATE SET
        "ProjectID" = EXCLUDED."ProjectID",
        "EstimateNumber" = EXCLUDED."EstimateNumber",
        "MoldVendorID" = EXCLUDED."MoldVendorID",
        "TotalQuotationAmount" = EXCLUDED."TotalQuotationAmount",
        "ModificationDateTime" = NOW()
      RETURNING *;
    `;

    const res = await pool.query(insertSql, [
      'TEST-EST-001',
      'MI26001P0',
      'EST-001',
      '우성정공(주)',
      1000,
      2000,
      3000,
      4000,
      10000,
      9500,
      45,
      '견적요청',
      '2026-11-05',
      'MPSI_HQ',
      JSON.stringify({ test: true, productName: 'Test Product' })
    ]);

    console.log('INSERT SUCCESS:', res.rows[0]);

    // Clean up test row
    await pool.query(`DELETE FROM "MpsiMoldQuotation" WHERE "QuotationID" = 'TEST-EST-001'`);
    console.log('CLEANUP SUCCESS');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await pool.end();
  }
}

testInsert();

