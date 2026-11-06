const { Pool } = require('pg');
const fs = require('fs');

let dbUrl = 'postgresql://mpsi_user:mpsi_secure_pwd@localhost:5432/mpsi_db?schema=public';
try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (match) dbUrl = match[1];
} catch (e) {}

const pool = new Pool({ connectionString: dbUrl });

async function insert006() {
  try {
    const notePayload = {
      officialProjectNo: "MI26004P0",
      moldNo: "",
      moldDegree: "M1",
      changeType: "N001",
      projectName: "Glove Box Housing Sub",
      productName: "Door Armrest Base",
      customerName: "7777777777777777777777 - 현대자동차 (1차사)",
      vendorName: "우성정공(주) 외 2개사",
      assignedVendors: ["우성정공(주)", "대한국제금형", "세진몰드"],
      productionType: "OUTSOURCING",
      machineTypeTonnage: "",
      coreStructure: "",
      moldMaterial: "",
      cavity: "1*2 Cavity - PP 컴파운드 사출물, 1*2 Cavity",
      gateType: "밸브게이트 2-Drop - C/T: 42초",
      moldSteel: "HP4MA",
      resin: "",
      targetT1Date: "2026-11-05",
      moldDeliveryDate: "2026-05-30",
      targetMfgDays: 45,
      targetCycleTime: 0,
      targetBudgetWon: 82000000,
      quotationFileName: "",
      quotationFileSize: "",
      quotationFileDate: "",
      vendorQuotes: [],
      specDocuments: [],
      submissionHistory: [],
      requestDate: "2026-11-05",
      submittedDate: "",
      notes: "신규 금형 견적 의뢰",
      vendorNotes: "",
      memos: []
    };

    const insertSql = `
      INSERT INTO "MpsiMoldQuotation" (
        "QuotationSequenceNo", "QuotationID", "ProjectID", "EstimateNumber", "MoldVendorID",
        "MaterialCost", "MachiningCost", "DesignCost", "ManagementCost", "TotalQuotationAmount",
        "FinalNegotiatedAmount", "TargetMoldDays", "QuotationStatus", "SubmissionDate", "CreatorID",
        "CreationDateTime", "ModifierID", "ModificationDateTime", "Note"
      ) VALUES (
        nextval('public."MpsiMoldQuotation_QuotationSequenceNo_seq"'),
        'M-EST-2026-006', 'MI26004P0', 'MI26004P0', '우성정공(주)',
        0, 0, 0, 0, 0,
        82000000, 45, '견적요청', '2026-11-05', 'MPSI_HQ',
        NOW(), 'MPSI_HQ', NOW(), $1
      )
      ON CONFLICT ("QuotationID") DO UPDATE SET
        "ProjectID" = EXCLUDED."ProjectID",
        "Note" = EXCLUDED."Note";
    `;

    await pool.query(insertSql, [JSON.stringify(notePayload)]);
    const res = await pool.query(`SELECT "QuotationSequenceNo", "QuotationID", "ProjectID", "FinalNegotiatedAmount" FROM "MpsiMoldQuotation" ORDER BY "QuotationSequenceNo" DESC;`);
    console.log("ALL ROWS NOW:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

insert006();

