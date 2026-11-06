const { Pool } = require('pg');
const fs = require('fs');

let dbUrl = 'postgresql://mpsi_user:mpsi_secure_pwd@localhost:5432/mpsi_db?schema=public';
try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (match) dbUrl = match[1];
} catch (e) {}

const pool = new Pool({ connectionString: dbUrl });

const items = [
  {
    estimateNo: "M-EST-2026-007",
    projectNo: "MI26005P0",
    officialProjectNo: "MI26005P0",
    projectName: "Hinge Lower Protective Shell",
    productName: "Door Armrest Base",
    customerName: "55555555555555555555555555555555555555555555555 - 현대자동차 (1차사)",
    vendorName: "우성정공(주)",
    assignedVendors: ["우성정공(주)"],
    productionType: "OUTSOURCING",
    cavity: "1*3 Cavity - PP 컴파운드 사출물, 1*2 Cavity",
    gateType: "밸브게이트 2-Drop - C/T: 50초",
    moldSteel: "SKD61",
    targetT1Date: "2026-11-05",
    targetMfgDays: 45,
    targetBudgetWon: 85000000,
    quoteAmountWon: 0,
    status: "견적요청",
    requestDate: "2026-11-05",
    notes: "우성정공 금형 신규 견적 의뢰",
    vendorQuotes: [],
    specDocuments: [],
    memos: []
  },
  {
    estimateNo: "M-EST-2026-006",
    projectNo: "MI26004P0",
    officialProjectNo: "MI26004P0",
    projectName: "Glove Box Housing Sub",
    productName: "Door Armrest Base",
    customerName: "7777777777777777777777 - 현대자동차 (1차사)",
    vendorName: "우성정공(주) 외 2개사",
    assignedVendors: ["우성정공(주)", "대한국제금형", "세진몰드"],
    productionType: "OUTSOURCING",
    cavity: "1*2 Cavity - PP 컴파운드 사출물, 1*2 Cavity",
    gateType: "밸브게이트 2-Drop - C/T: 42초",
    moldSteel: "HP4MA",
    targetT1Date: "2026-11-05",
    moldDeliveryDate: "2026-05-30",
    targetMfgDays: 45,
    targetBudgetWon: 82000000,
    quoteAmountWon: 0,
    status: "견적요청",
    requestDate: "2026-11-05",
    notes: "신규 금형 견적 의뢰",
    vendorQuotes: [],
    specDocuments: [],
    memos: []
  }
];

async function syncToDb() {
  try {
    for (const item of items) {
      const notePayload = {
        officialProjectNo: item.officialProjectNo,
        moldNo: item.moldNo || '',
        moldDegree: 'M1',
        changeType: 'N001',
        projectName: item.projectName,
        productName: item.productName,
        customerName: item.customerName,
        vendorName: item.vendorName,
        assignedVendors: item.assignedVendors,
        productionType: item.productionType,
        cavity: item.cavity,
        gateType: item.gateType,
        moldSteel: item.moldSteel,
        targetT1Date: item.targetT1Date,
        moldDeliveryDate: item.moldDeliveryDate || '',
        targetMfgDays: item.targetMfgDays,
        targetBudgetWon: item.targetBudgetWon,
        quotationFileName: '',
        quotationFileSize: '',
        quotationFileDate: '',
        vendorQuotes: item.vendorQuotes,
        specDocuments: item.specDocuments,
        requestDate: item.requestDate,
        notes: item.notes,
        memos: item.memos
      };

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
          "CreationDateTime",
          "ModifierID",
          "ModificationDateTime",
          "Note"
        ) VALUES (
          COALESCE(
            (SELECT "QuotationSequenceNo" FROM "MpsiMoldQuotation" WHERE "QuotationID" = $1),
            nextval('public."MpsiMoldQuotation_QuotationSequenceNo_seq"')
          ),
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), $15, NOW(), $16
        )
        ON CONFLICT ("QuotationID") DO UPDATE SET
          "ProjectID" = EXCLUDED."ProjectID",
          "EstimateNumber" = EXCLUDED."EstimateNumber",
          "MoldVendorID" = EXCLUDED."MoldVendorID",
          "TotalQuotationAmount" = EXCLUDED."TotalQuotationAmount",
          "FinalNegotiatedAmount" = EXCLUDED."FinalNegotiatedAmount",
          "TargetMoldDays" = EXCLUDED."TargetMoldDays",
          "QuotationStatus" = EXCLUDED."QuotationStatus",
          "ModificationDateTime" = NOW(),
          "Note" = EXCLUDED."Note"
        RETURNING *;
      `;

      const params = [
        item.estimateNo,
        item.projectNo,
        item.officialProjectNo,
        item.assignedVendors[0] || '우성정공(주)',
        0,
        0,
        0,
        0,
        item.quoteAmountWon,
        item.targetBudgetWon,
        item.targetMfgDays,
        item.status,
        item.requestDate,
        'MPSI_HQ',
        'MPSI_HQ',
        JSON.stringify(notePayload)
      ];

      const res = await pool.query(insertSql, params);
      console.log('SYNCED TO DB:', res.rows[0].QuotationID, 'Sequence:', res.rows[0].QuotationSequenceNo);
    }

    const check = await pool.query(`SELECT "QuotationSequenceNo", "QuotationID", "ProjectID", "MoldVendorID", "QuotationStatus", "FinalNegotiatedAmount" FROM "MpsiMoldQuotation"`);
    console.log('ALL DB ROWS NOW:', check.rows);
  } catch (err) {
    console.error('ERROR SYNCING TO DB:', err);
  } finally {
    await pool.end();
  }
}

syncToDb();

