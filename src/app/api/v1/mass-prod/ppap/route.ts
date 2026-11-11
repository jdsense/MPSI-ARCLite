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

function deriveMoldNo(projectNo?: string): string {
  if (!projectNo) return "-";
  const base = projectNo.replace(/^[Qq]/, "MI").replace(/P\d+$/i, "").replace(/-\d+$/, "");
  return `${base}M`;
}

function mapRowToPpapItem(row: any): PPAPApprovalItem {
  let note: any = {};
  try {
    note = JSON.parse(row.Note || "{}");
  } catch {}

  let pmNote: any = {};
  if (row.ProjectNote) {
    try {
      pmNote = JSON.parse(row.ProjectNote || "{}");
    } catch {}
  }

  const packageSubmissions: PPAPPackageSubmissionHistoryItem[] = note.packageSubmissions || [];
  const pid = row.ProjectID || note.projectNo;

  const moldNo = (note.moldNo && note.moldNo !== "MI26005P0M")
    ? note.moldNo
    : (pmNote.moldNo || deriveMoldNo(pid));

  const partNo = (note.partNo && note.partNo !== "-")
    ? note.partNo
    : (pmNote.partNo || row.ProjectItemID || "-");

  const machineNo = (note.machineNo && note.machineNo !== "사출 6호기 (650T)")
    ? note.machineNo
    : (pmNote.machineTon ? `${pmNote.machineTon}T` : (note.machineNo || "사출 6호기 (650T)"));

  return {
    id: Number(row.PpapSequenceNo),
    ppapNo: row.PpapID || note.ppapNo || `PPAP-${pid}`,
    projectNo: pid,
    partNo,
    projectName: note.projectName || pmNote.projectName || row.PmProjectName || pid || "양산 프로젝트",
    productName: note.productName || pmNote.productName || "사출 성형 부품",
    moldVendor: note.moldVendor || pmNote.moldVendor || "우성정공(주)",
    massVendor: row.MassVendorID || note.massVendor || pmNote.massVendor || "(주)뉴몰드",
    moldNo,
    machineNo,
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

        // 더미 프로젝트 배제 (실제 프로젝트 MI26001 등은 정상 보존)
        if (
          pid === "MI25001P1" ||
          pid === "MI25001P2" ||
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
          let pmNote: any = {};
          try {
            const pmRes = await query(`SELECT "ItemID", "ProjectName", "Note" FROM "ProjectMaster" WHERE "ProjectID" = $1 LIMIT 1`, [pid]);
            if (pmRes.rows.length > 0) {
              pmInfo = pmRes.rows[0];
              try { pmNote = JSON.parse(pmInfo.Note || "{}"); } catch {}
            }
          } catch {}

          const moldNo = (vMeta.moldNo && vMeta.moldNo !== "MI26005P0M")
            ? vMeta.moldNo
            : (pmNote.moldNo || deriveMoldNo(pid));
          const partNo = (vMeta.partNo && vMeta.partNo !== "-")
            ? vMeta.partNo
            : (pmNote.partNo || pmInfo.ItemID || "-");
          const machineNo = vMeta.trials?.[vMeta.trials.length - 1]?.machineNo || (pmNote.machineTon ? `${pmNote.machineTon}T` : "사출 6호기 (650T)");

          const initialPpapMeta: Partial<PPAPApprovalItem> = {
            id: 0,
            ppapNo: ppapId,
            projectNo: pid,
            partNo,
            projectName: vMeta.projectName || pmNote.projectName || pmInfo.ProjectName || pid,
            productName: vMeta.productName || pmNote.productName || "사출 성형 부품",
            moldVendor: vMeta.moldVendor || pmNote.moldVendor || "우성정공(주)",
            massVendor: massVendor,
            moldNo,
            machineNo,
            packageSubmissions: [],
            ppapStatus: "검토 대기",
            continuousHours: vMeta.trials?.[vMeta.trials.length - 1]?.continuousHours ?? 12,
            totalShotCount: vMeta.trials?.[vMeta.trials.length - 1]?.totalShotCount ?? 0,
            totalProduced: vMeta.trials?.[vMeta.trials.length - 1]?.totalProduced ?? 0,
            defectRate: vMeta.trials?.[vMeta.trials.length - 1]?.defectRate ?? 0,
            measuredCpk: vMeta.trials?.[vMeta.trials.length - 1]?.measuredCpk ?? 1.33,
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

    // 2. PPAP 목록 조회 (ProjectMaster와 LEFT JOIN하여 정식 moldNo, partNo, machineNo 동기화)
    let sql = `
      SELECT p."PpapSequenceNo", p."PpapID", p."ProjectID", p."MassVendorID", p."PpapStatus",
             p."CurrentStep", p."CompletionRate", p."TargetApprovalDate", p."ModificationDateTime", p."Note",
             pm."Note" as "ProjectNote", pm."ItemID" as "ProjectItemID", pm."ProjectName" as "PmProjectName"
      FROM "MpsiMassPpap" p
      LEFT JOIN "ProjectMaster" pm ON pm."ProjectID" = p."ProjectID"
    `;
    const params: any[] = [];

    if (projectId) {
      sql += ` WHERE p."ProjectID" = $1`;
      params.push(projectId);
    }

    sql += ` ORDER BY p."PpapSequenceNo" ASC`;

    const res = await query(sql, params);

    const items: PPAPApprovalItem[] = res.rows
      .map(mapRowToPpapItem)
      .filter(
        (it) =>
          !it.projectName?.includes("현대 NT5") &&
          !it.projectName?.includes("NQ5") &&
          it.projectNo !== "MI25001P1" &&
          it.projectNo !== "MI25001P2"
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

