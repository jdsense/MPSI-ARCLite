const { Pool } = require('pg');
const fs = require('fs');

let dbUrl = 'postgresql://mpsi_user:mpsi_secure_pwd@localhost:5432/mpsi_db?schema=public';
try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (match) dbUrl = match[1];
} catch (e) {}

const pool = new Pool({ connectionString: dbUrl });

async function testDuplicate() {
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
        "ConfirmedDate",
        "CreatorID",
        "CreationDateTime",
        "ModifierID",
        "ModificationDateTime",
        "Note"
      ) VALUES (
        COALESCE(
          (SELECT "QuotationSequenceNo" FROM "MpsiMoldQuotation" WHERE "QuotationID" = $1),
          nextval('public."MpsiMoldQuotation_QuotationSequenceNo_seq"')
        ),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), $16, NOW(), $17
      )
      ON CONFLICT ("QuotationID") DO UPDATE SET
        "ProjectID" = EXCLUDED."ProjectID"
      RETURNING *;
    `;

    // Try inserting M-EST-2026-008 again!
    const res = await pool.query(insertSql, [
      'M-EST-2026-008', 'MI26005P0', 'MI26005P0', '우성정공(주)',
      0, 0, 0, 0, 0, 85000000, 45, '견적요청',
      '2026-11-05', null, 'MPSI_HQ', 'MPSI_HQ', '{}'
    ]);
    console.log("INSERT RES:", res.rows[0]);
  } catch (err) {
    console.error("EXACT ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

testDuplicate();

