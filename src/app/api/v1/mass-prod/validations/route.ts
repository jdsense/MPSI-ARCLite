import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  MassValidationProject,
  MassValidationRecord,
  ValidationCheckItem,
} from "@/lib/mass-validation-store";
import { syncDownstreamToProjectMaster } from "@/lib/project-master-sync";

// 6대 양산성 검증 기본 체크리스트 템플릿
const DEFAULT_CHECKLIST: ValidationCheckItem[] = [
  {
    id: "v1",
    category: "치수검토보고서",
    description: "CTQ 주요 치수 5개 포인트 전수 측정 및 3차원 CMM 성적서",
    targetSpec: "±0.05mm",
    actualValue: "",
    isResolved: false,
  },
  {
    id: "v2",
    category: "외관검토보고서",
    description: "12시간 연속 사출 시 미성형, 가스그을림, 웰드라인 점검",
    targetSpec: "한도견본 일치 (외관 결함 무)",
    actualValue: "",
    isResolved: false,
  },
  {
    id: "v3",
    category: "금형검사보고서",
    description: "지정 사출기 취부 및 슬라이드 코어 유압 연동, 핫러너 밸런스",
    targetSpec: "작동 이상 무 (온도 ±2℃ 유지)",
    actualValue: "",
    isResolved: false,
  },
  {
    id: "v4",
    category: "시사출 보고서(사출조건표 포함)",
    description: "연속 사출 평균 C/T 검증 및 표준 사출 성형 조건표 (온도/압력/속도)",
    targetSpec: "35.0s 이하 달성",
    actualValue: "",
    isResolved: false,
  },
  {
    id: "v5",
    category: "공정능력 검사 보고서",
    description: "연속 생산 30개 샘플 치수 공정능력지수(Cpk) 산출",
    targetSpec: "Cpk ≥ 1.33",
    actualValue: "",
    isResolved: false,
  },
  {
    id: "v6",
    category: "CAPA 검토 보고서",
    description: "일일 3교대 연속 생산 기준 공급 캐파 검증 (Run @ Rate 실사)",
    targetSpec: "4,500 EA/일 이상",
    actualValue: "",
    isResolved: false,
  },
];

async function ensureTableInitialized() {
  await query(`
    CREATE TABLE IF NOT EXISTS "MpsiMassValidation" (
      "ValidationSequenceNo" SERIAL PRIMARY KEY,
      "ValidationID" VARCHAR(64) UNIQUE NOT NULL,
      "ProjectID" VARCHAR(64) NOT NULL,
      "MassVendorID" VARCHAR(100),
      "CurrentTrial" VARCHAR(20) DEFAULT 'T1',
      "OverallStatus" VARCHAR(50) DEFAULT '시양산 대기',
      "CurrentStep" INT DEFAULT 11,
      "ReportCount" INT DEFAULT 0,
      "TargetMassApprovalDate" DATE,
      "CreatorID" VARCHAR(50) DEFAULT 'MPSI_HQ',
      "CreationDateTime" TIMESTAMP DEFAULT NOW(),
      "ModificationDateTime" TIMESTAMP DEFAULT NOW(),
      "Note" TEXT
    );
  `);
}

function mapRowToProject(row: any): MassValidationProject {
  let note: any = {};
  try {
    note = JSON.parse(row.Note || "{}");
  } catch {}

  const trials: MassValidationRecord[] = note.trials || [
    {
      trialDegree: row.CurrentTrial || "T1",
      testDate: new Date().toISOString().slice(0, 10),
      machineNo: note.machineNo || "사출 6호기 (650T)",
      continuousHours: 12,
      totalShotCount: 0,
      totalProduced: 0,
      defectCount: 0,
      defectRate: 0,
      targetDefectRate: 1.0,
      measuredCpk: 0,
      targetCpk: 1.33,
      measuredCycleTime: 0,
      targetCycleTime: note.targetCycleTime || 35,
      dailyCapa: 0,
      targetDailyCapa: 4500,
      completionRate: 0,
      status: "시양산 진행중",
      checklist: DEFAULT_CHECKLIST,
      opinion: "",
      uploadHistory: [],
    },
  ];

  return {
    id: Number(row.ValidationSequenceNo),
    projectNo: row.ProjectID || note.projectNo,
    officialProjectNo: note.officialProjectNo || row.ProjectID,
    projectName: note.projectName || row.ProjectID || "양산 프로젝트",
    productName: note.productName || "사출 성형 부품",
    customerName: note.customerName || "원청 고객사",
    moldVendor: note.moldVendor || "우성정공(주)",
    massVendor: row.MassVendorID || note.massVendor || "(주)뉴몰드",
    currentTrial: row.CurrentTrial || note.currentTrial || "T1",
    moldTransferDate: note.moldTransferDate || "",
    targetMassApprovalDate: note.targetMassApprovalDate || "2026-12-20",
    overallStatus: row.OverallStatus || note.overallStatus || "시양산 대기",
    currentStep: Number(row.CurrentStep) || note.currentStep || 11,
    moldTransferConfirmed: Boolean(note.moldTransferConfirmed),
    urgentMoldRevision: note.urgentMoldRevision,
    urgentRevisionDetail: note.urgentRevisionDetail,
    mpsiWitnessInspector: note.mpsiWitnessInspector || "MPSI 품질팀",
    trials,
    updatedAt: note.updatedAt || new Date().toISOString().replace("T", " ").slice(0, 16),
  };
}

export async function GET(req: NextRequest) {
  try {
    await ensureTableInitialized();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    // 1. 견적 수주확정 / 단가합의완료 / 자체진행 프로젝트 자동 등재 연계
    try {
      const quoteRows = await query(`
        SELECT q."ProjectID", q."EstimateNumber", q."MassVendorID", q."ProductionType", 
               q."UnitPrice", q."TargetCycleTime", q."QuotationStatus", q."Note"
        FROM "MpsiMassQuotation" q
      `);

      for (const q of quoteRows.rows) {
        let qMeta: any = {};
        try {
          qMeta = JSON.parse(q.Note || "{}");
        } catch {}

        const pid = q.ProjectID || qMeta.projectNo;
        if (!pid) continue;

        // 구형 레거시 더미 프로젝트 배제 (실제 프로젝트 MI26001P0 등은 정상 등록)
        if (
          pid.includes("MI25001") ||
          qMeta.projectName?.includes("NQ5") ||
          qMeta.projectName?.includes("현대 NT5")
        ) {
          continue;
        }

        // 수주확정(단가합의완료 / 양산계약확정 / 자체진행 / vq.status === '수주확정') 여부 확인
        const isSelf = q.ProductionType === "IN_HOUSE" || q.QuotationStatus === "자체진행";
        const hasWonQuote = qMeta.vendorQuotes?.some((vq: any) => vq.status === "수주확정");
        const isWon =
          isSelf ||
          q.QuotationStatus === "단가합의완료" ||
          q.QuotationStatus === "양산계약확정" ||
          hasWonQuote;

        if (!isWon) continue;

        // MpsiMassValidation 테이블에 이미 있는지 확인
        const valExist = await query(
          `SELECT "ValidationSequenceNo" FROM "MpsiMassValidation" WHERE "ProjectID" = $1`,
          [pid]
        );

        if (valExist.rows.length === 0) {
          const selectedVendor =
            qMeta.selectedVendorName ||
            qMeta.vendorQuotes?.find((vq: any) => vq.status === "수주확정")?.vendorName ||
            q.MassVendorID ||
            (isSelf ? "MPSI 자체사출공장" : "(주)뉴몰드");

          const validationId = `VAL-${pid}`;
          const dateStr = new Date().toISOString().slice(0, 10);

          let isMoldTransferred = false;
          let transferDate = qMeta.massStartDate || "";
          try {
            const tRes = await query(`SELECT "TrialStatus", "Note" FROM "MpsiMoldTrial" WHERE "ProjectID" = $1 LIMIT 1`, [pid]);
            if (tRes.rows.length > 0) {
              let tMeta: any = {};
              try { tMeta = JSON.parse(tRes.rows[0].Note || "{}"); } catch {}
              if (tMeta.isMoldApproved || tMeta.transferActualDate || tRes.rows[0].TrialStatus === "양산승인완료") {
                isMoldTransferred = true;
                if (tMeta.transferActualDate) transferDate = tMeta.transferActualDate;
              }
            }
          } catch {}

          const initialProjectMeta: MassValidationProject = {
            id: 0,
            projectNo: pid,
            officialProjectNo: pid,
            projectName: qMeta.projectName || pid,
            productName: qMeta.productName || "사출 성형 부품",
            customerName: qMeta.customerName || "원청 고객사",
            moldVendor: "우성정공(주)",
            massVendor: selectedVendor,
            currentTrial: "T1",
            moldTransferDate: transferDate,
            targetMassApprovalDate: qMeta.targetMassApprovalDate || "2026-12-20",
            overallStatus: "시양산 대기",
            currentStep: 11,
            moldTransferConfirmed: isMoldTransferred,
            mpsiWitnessInspector: "MPSI 품질팀",
            trials: [
              {
                trialDegree: "T1",
                testDate: dateStr,
                machineNo: qMeta.machineTonnage || "사출 6호기 (650T)",
                continuousHours: 12,
                totalShotCount: 0,
                totalProduced: 0,
                defectCount: 0,
                defectRate: 0,
                targetDefectRate: 1.0,
                measuredCpk: 0,
                targetCpk: 1.33,
                measuredCycleTime: 0,
                targetCycleTime: qMeta.targetCycleTime || Number(q.TargetCycleTime) || 35,
                dailyCapa: 0,
                targetDailyCapa: 4500,
                completionRate: 0,
                status: "시양산 진행중",
                checklist: DEFAULT_CHECKLIST,
                opinion: isSelf
                  ? "[자체사출 배정] MPSI 사내 공장에서 12시간 연속 사출 및 Cpk 검증 착수 대기 중입니다."
                  : `[사출 수주확정 연계] 양산 견적 체결(${selectedVendor})에 따라 12~24H 연속 사출 양산성 검증(Step 11)이 자동 등재되었습니다.`,
                uploadHistory: [],
              },
            ],
            updatedAt: `${dateStr} 09:00`,
          };

          await query(
            `
            INSERT INTO "MpsiMassValidation" (
              "ValidationID", "ProjectID", "MassVendorID", "CurrentTrial",
              "OverallStatus", "CurrentStep", "ReportCount", "TargetMassApprovalDate",
              "CreatorID", "CreationDateTime", "Note"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10
            )
          `,
            [
              validationId,
              pid,
              selectedVendor,
              "T1",
              "시양산 대기",
              11,
              0,
              initialProjectMeta.targetMassApprovalDate,
              "MPSI_HQ",
              JSON.stringify(initialProjectMeta),
            ]
          );
        }
      }
    } catch (autoErr) {
      console.warn("[MassValidation AutoSync Warning]", autoErr);
    }

    // 2. 조회 실행
    let sql = `SELECT * FROM "MpsiMassValidation" ORDER BY "ValidationSequenceNo" DESC`;
    let params: any[] = [];
    if (projectId) {
      sql = `SELECT * FROM "MpsiMassValidation" WHERE "ProjectID" = $1 ORDER BY "ValidationSequenceNo" DESC`;
      params = [projectId];
    }

    const { rows } = await query(sql, params);

    const items = rows
      .map(mapRowToProject)
      .filter((it: MassValidationProject) => {
        // 구형 레거시 더미 데이터 엄격 제외 (실제 프로젝트 MI26001P0 등은 정상 조회)
        if (
          it.projectNo === "MI25001P1" ||
          it.projectNo === "MI25001P2" ||
          it.projectName?.includes("현대 NT5") ||
          it.projectName?.includes("NQ5")
        ) {
          return false;
        }
        return true;
      });

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    console.error("[API mass-prod/validations GET Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch mass validations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTableInitialized();
    const body: MassValidationProject = await req.json();

    if (!body.projectNo) {
      return NextResponse.json({ success: false, error: "projectNo is required" }, { status: 400 });
    }

    const valId = `VAL-${body.projectNo}`;
    const vendorName = body.massVendor || "(주)뉴몰드";
    const reportCount =
      body.trials?.reduce(
        (acc, t) => acc + (t.checklist?.filter((c) => Boolean(c.attachedReport)).length || 0),
        0
      ) || 0;

    const existing = await query(
      `SELECT "ValidationSequenceNo" FROM "MpsiMassValidation" WHERE "ValidationID" = $1 OR "ProjectID" = $2`,
      [valId, body.projectNo]
    );

    let savedItem: MassValidationProject;

    if (existing.rows.length > 0) {
      const seqNo = existing.rows[0].ValidationSequenceNo;
      await query(
        `
        UPDATE "MpsiMassValidation"
        SET 
          "MassVendorID" = $1,
          "CurrentTrial" = $2,
          "OverallStatus" = $3,
          "CurrentStep" = $4,
          "ReportCount" = $5,
          "TargetMassApprovalDate" = $6,
          "ModificationDateTime" = NOW(),
          "Note" = $7
        WHERE "ValidationSequenceNo" = $8
      `,
        [
          vendorName,
          body.currentTrial || "T1",
          body.overallStatus || "시양산 대기",
          body.currentStep || 11,
          reportCount,
          body.targetMassApprovalDate || null,
          JSON.stringify(body),
          seqNo,
        ]
      );
      savedItem = { ...body, id: Number(seqNo) };
    } else {
      const insRes = await query(
        `
        INSERT INTO "MpsiMassValidation" (
          "ValidationID", "ProjectID", "MassVendorID", "CurrentTrial",
          "OverallStatus", "CurrentStep", "ReportCount", "TargetMassApprovalDate",
          "CreatorID", "CreationDateTime", "Note"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10
        ) RETURNING "ValidationSequenceNo"
      `,
        [
          valId,
          body.projectNo,
          vendorName,
          body.currentTrial || "T1",
          body.overallStatus || "시양산 대기",
          body.currentStep || 11,
          reportCount,
          body.targetMassApprovalDate || null,
          "MPSI_HQ",
          JSON.stringify(body),
        ]
      );
      savedItem = { ...body, id: Number(insRes.rows[0].ValidationSequenceNo) };
    }

    const anyBody = body as any;
    await syncDownstreamToProjectMaster(body.projectNo, {
      targetMassDate: body.targetMassApprovalDate,
      moldDeliveryDate: body.moldTransferDate,
      massVendor: vendorName,
      cavity: anyBody.cavity,
      currentStep: body.currentStep || 11,
    });

    return NextResponse.json({ success: true, data: savedItem });
  } catch (error: any) {
    console.error("[API mass-prod/validations POST Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save mass validation" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

