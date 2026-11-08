import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  PPAPApprovalItem,
  PPAPPackageSubmissionHistoryItem,
  DEFAULT_PPAP_DOCUMENTS,
} from "@/lib/mass-ppap-store";

async function ensureTableInitialized() {
  await query(`
    CREATE TABLE IF NOT EXISTS "MpsiMassPpap" (
      "PpapSequenceNo" SERIAL PRIMARY KEY,
      "PpapID" VARCHAR(64) UNIQUE NOT NULL,
      "ProjectID" VARCHAR(64) NOT NULL,
      "MassVendorID" VARCHAR(100),
      "PpapStatus" VARCHAR(50) DEFAULT '검토 대기',
      "CurrentStep" INT DEFAULT 12,
      "CompletionRate" INT DEFAULT 0,
      "TargetApprovalDate" DATE,
      "CreatorID" VARCHAR(50) DEFAULT 'MPSI_HQ',
      "CreationDateTime" TIMESTAMP DEFAULT NOW(),
      "ModificationDateTime" TIMESTAMP DEFAULT NOW(),
      "Note" TEXT
    );
  `);
}

function mapRowToPpapItem(row: any): PPAPApprovalItem {
  let note: any = {};
  try {
    note = JSON.parse(row.Note || "{}");
  } catch {}

  const packageSubmissions: PPAPPackageSubmissionHistoryItem[] = note.packageSubmissions || [];

  return {
    id: Number(row.PpapSequenceNo),
    ppapNo: row.PpapID || note.ppapNo || `PPAP-${row.ProjectID}`,
    projectNo: row.ProjectID || note.projectNo,
    partNo: note.partNo || "-",
    projectName: note.projectName || row.ProjectID || "양산 프로젝트",
    productName: note.productName || "사출 성형 부품",
    moldVendor: note.moldVendor || "우성정공(주)",
    massVendor: row.MassVendorID || note.massVendor || "(주)뉴몰드",
    moldNo: note.moldNo || "MI26005P0M",
    machineNo: note.machineNo || "사출 6호기 (650T)",
    packageSubmissions,
    ppapStatus: row.PpapStatus || note.ppapStatus || (packageSubmissions.length > 0 ? "검토 진행 중" : "검토 대기"),
    continuousHours: note.continuousHours ?? 12,
    totalShotCount: note.totalShotCount ?? 1300,
    totalProduced: note.totalProduced ?? 2600,
    defectRate: note.defectRate ?? 0.58,
    measuredCpk: note.measuredCpk ?? 1.45,
    oqcResult: note.oqcResult || "OK",
    vendorOpinion: note.vendorOpinion || "",
    vendorSubmittedDate: note.vendorSubmittedDate || "",
    completionRate: Number(row.CompletionRate) || note.completionRate || 0,
    documents: note.documents || DEFAULT_PPAP_DOCUMENTS,
    mpsiOpinion: note.mpsiOpinion || "",
    rejectReason: note.rejectReason || "",
    partPoNo: note.partPoNo || "",
    partPoDate: note.partPoDate || "",
    approvalOfficer: note.approvalOfficer || "",
    currentStep: Number(row.CurrentStep) || note.currentStep || 12,
    updatedAt: note.updatedAt || new Date().toISOString().replace("T", " ").slice(0, 16),
  };
}

export async function GET(req: NextRequest) {
  try {
    await ensureTableInitialized();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    // 1. 양산성 검증(MpsiMassValidation)에서 '검증완료' 또는 '양산승인(내부)' 완료된 프로젝트 자동 등재 연계
    try {
      const valRows = await query(`
        SELECT v."ProjectID", v."MassVendorID", v."CurrentTrial", v."OverallStatus", 
               v."CurrentStep", v."TargetMassApprovalDate", v."Note"
        FROM "MpsiMassValidation" v
      `);

      for (const v of valRows.rows) {
        let vMeta: any = {};
        try {
          vMeta = JSON.parse(v.Note || "{}");
        } catch {}

        const pid = v.ProjectID || vMeta.projectNo;
        if (!pid) continue;

        // 더미 프로젝트 배제
        if (
          pid.includes("MI25001") ||
          pid.includes("MI26001") ||
          pid.includes("MI26002") ||
          pid.includes("MI26003") ||
          vMeta.projectName?.includes("NQ5") ||
          vMeta.projectName?.includes("현대 NT5")
        ) {
          continue;
        }

        // '검증완료' 또는 최신 trial의 status === '양산승인(내부)' 여부 확인
        const isValidationComplete =
          v.OverallStatus === "검증완료" ||
          vMeta.overallStatus === "검증완료" ||
          vMeta.trials?.some((tr: any) => tr.status === "양산승인(내부)");

        if (!isValidationComplete) continue;

        // MpsiMassPpap 테이블에 이미 존재하는지 확인
        const ppapExist = await query(
          `SELECT "PpapSequenceNo" FROM "MpsiMassPpap" WHERE "ProjectID" = $1`,
          [pid]
        );

        if (ppapExist.rows.length === 0) {
          const massVendor = v.MassVendorID || vMeta.massVendor || "(주)뉴몰드";
          const ppapId = `PPAP-${pid}`;
          const dateStr = new Date().toISOString().slice(0, 10);

          let pmInfo: any = {};
          try {
            const pmRes = await query(`SELECT "ItemID", "ProjectName", "PartName" FROM "ProjectMaster" WHERE "ProjectID" = $1 LIMIT 1`, [pid]);
            if (pmRes.rows.length > 0) {
              pmInfo = pmRes.rows[0];
            }
          } catch {}

          const initialPpapMeta: Partial<PPAPApprovalItem> = {
            id: 0,
            ppapNo: ppapId,
            projectNo: pid,
            partNo: vMeta.partNo || pmInfo.ItemID || "-",
            projectName: vMeta.projectName || pmInfo.ProjectName || pid,
            productName: vMeta.productName || pmInfo.PartName || "사출 성형 부품",
            moldVendor: vMeta.moldVendor || "우성정공(주)",
            massVendor: massVendor,
            moldNo: vMeta.moldNo || `${pid}M`,
            machineNo: vMeta.trials?.[vMeta.trials.length - 1]?.machineNo || "사출 6호기 (650T)",
            packageSubmissions: [],
            ppapStatus: "검토 대기",
            continuousHours: vMeta.trials?.[vMeta.trials.length - 1]?.continuousHours ?? 12,
            totalShotCount: vMeta.trials?.[vMeta.trials.length - 1]?.totalShotCount ?? 1300,
            totalProduced: vMeta.trials?.[vMeta.trials.length - 1]?.totalProduced ?? 2600,
            defectRate: vMeta.trials?.[vMeta.trials.length - 1]?.defectRate ?? 0.58,
            measuredCpk: vMeta.trials?.[vMeta.trials.length - 1]?.measuredCpk ?? 1.45,
            oqcResult: "OK",
            completionRate: 0,
            documents: DEFAULT_PPAP_DOCUMENTS,
            mpsiOpinion: "",
            currentStep: 12,
            updatedAt: `${dateStr} 09:00`,
          };

          await query(
            `
            INSERT INTO "MpsiMassPpap" (
              "PpapID", "ProjectID", "MassVendorID", "PpapStatus",
              "CurrentStep", "CompletionRate", "TargetApprovalDate",
              "CreatorID", "CreationDateTime", "Note"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9
            )
            ON CONFLICT ("PpapID") DO NOTHING
            `,
            [
              ppapId,
              pid,
              massVendor,
              "검토 대기",
              12,
              0,
              v.TargetMassApprovalDate || null,
              "MPSI_HQ",
              JSON.stringify(initialPpapMeta),
            ]
          );
        }
      }
    } catch (err) {
      console.warn("Auto-enroll PPAP from validation warning:", err);
    }

    // 2. PPAP 목록 조회
    let sql = `
      SELECT "PpapSequenceNo", "PpapID", "ProjectID", "MassVendorID", "PpapStatus",
             "CurrentStep", "CompletionRate", "TargetApprovalDate", "ModificationDateTime", "Note"
      FROM "MpsiMassPpap"
    `;
    const params: any[] = [];

    if (projectId) {
      sql += ` WHERE "ProjectID" = $1`;
      params.push(projectId);
    }

    sql += ` ORDER BY "PpapSequenceNo" ASC`;

    const res = await query(sql, params);

    const items: PPAPApprovalItem[] = res.rows
      .map(mapRowToPpapItem)
      .filter(
        (it) =>
          !it.projectName?.includes("현대 NT5") &&
          !it.projectNo.includes("MI26001") &&
          !it.projectNo.includes("MI26002") &&
          !it.projectNo.includes("MI26003")
      );

    return NextResponse.json({
      success: true,
      data: items,
      total: items.length,
    });
  } catch (error: any) {
    console.error("GET /api/v1/mass-prod/ppap error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch PPAP items" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTableInitialized();
    const body = await req.json();

    const pid = body.projectNo || body.ProjectID;
    if (!pid) {
      return NextResponse.json(
        { success: false, error: "ProjectID (projectNo) is required" },
        { status: 400 }
      );
    }

    const ppapId = body.ppapNo || `PPAP-${pid}`;
    const massVendor = body.massVendor || body.MassVendorID || "(주)뉴몰드";
    const status = body.ppapStatus || body.status || "검토 대기";
    const currentStep = body.currentStep || (status === "승인완료" ? 13 : 12);
    const completionRate = body.completionRate || 0;
    const targetApprovalDate = body.targetApprovalDate || null;

    const note = JSON.stringify(body);

    const upsertSql = `
      INSERT INTO "MpsiMassPpap" (
        "PpapID", "ProjectID", "MassVendorID", "PpapStatus",
        "CurrentStep", "CompletionRate", "TargetApprovalDate",
        "ModificationDateTime", "Note"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
      ON CONFLICT ("PpapID") DO UPDATE SET
        "MassVendorID" = EXCLUDED."MassVendorID",
        "PpapStatus" = EXCLUDED."PpapStatus",
        "CurrentStep" = EXCLUDED."CurrentStep",
        "CompletionRate" = EXCLUDED."CompletionRate",
        "TargetApprovalDate" = COALESCE(EXCLUDED."TargetApprovalDate", "MpsiMassPpap"."TargetApprovalDate"),
        "ModificationDateTime" = NOW(),
        "Note" = EXCLUDED."Note"
      RETURNING *;
    `;

    const res = await query(upsertSql, [
      ppapId,
      pid,
      massVendor,
      status,
      currentStep,
      completionRate,
      targetApprovalDate,
      note,
    ]);

    const saved = mapRowToPpapItem(res.rows[0]);

    return NextResponse.json({
      success: true,
      data: saved,
      message: "PPAP record saved successfully",
    });
  } catch (error: any) {
    console.error("POST /api/v1/mass-prod/ppap error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save PPAP record" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

