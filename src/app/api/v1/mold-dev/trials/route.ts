import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// 5대 필수 서류 기본 템플릿 (서버용)
function createServerDefaultFinalDocs() {
  return [
    {
      key: "approvalCertificate",
      label: "금형승인원 (금형 및 최종샘플사진)",
      description: "금형 실물 전체 조립 사진, 명판 및 최종 초물 승인 제품 샘플 전수 촬영본 첨부",
      isVerified: false,
      isRejected: false,
    },
    {
      key: "caeReport",
      label: "CAE 보고서",
      description: "유동/보압 해석, 변형 예측 및 웰드라인 검증 최종 성형해석 완료 보고서",
      isVerified: false,
      isRejected: false,
    },
    {
      key: "trialReportWithCond",
      label: "시사출 완료 보고서 (사출조건표 포함)",
      description: "최종 차수 시사출 성적서 및 기계 조건표(사출압, 형체력, 수지온도, 실측 C/T)",
      isVerified: false,
      isRejected: false,
    },
    {
      key: "moldSpecification",
      label: "금형 제작 사양서",
      description: "금형 규격, 캐비티 배열, 핫러너 및 냉각 채널 설계 최종 확정 사양서",
      isVerified: false,
      isRejected: false,
    },
    {
      key: "moldChecklist",
      label: "금형 검사 체크리스트",
      description: "부품 가공 조립 내역, 슬라이드/경사이젝터 간섭, 건드릴 냉각 채널 통수 검사서",
      isVerified: false,
      isRejected: false,
    },
  ];
}

let trialSchemaEnsured = false;
async function ensureTrialSchema() {
  if (trialSchemaEnsured) return;
  try {
    await query(`
      ALTER TABLE IF EXISTS "MpsiMoldTrial" 
        ADD COLUMN IF NOT EXISTS "Note" TEXT;
    `);
    trialSchemaEnsured = true;
  } catch (e) {
    console.warn("[Trial Schema Warning]", e);
  }
}

export async function GET(req: Request) {
  try {
    await ensureTrialSchema();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    // 1. MpsiMoldManufacture 또는 ProjectMaster에서 실제 프로젝트(MI26005P0 등) 자동 동기화 확인
    try {
      const pmRows = await query(`
        SELECT p."ProjectID", p."ProjectName", p."CustomerName", p."TargetT1Date", p."PartName"
        FROM "ProjectMaster" p
        WHERE p."ProjectID" NOT IN ('MI25001P1', 'MI25001P2', 'MI26001P0', 'MI26002P0', 'MI26003P0')
          AND p."ProjectID" IS NOT NULL
      `);

      for (const p of pmRows.rows) {
        const pid = p.ProjectID;
        if (!pid) continue;

        // MpsiMoldTrial에 이미 있는지 확인
        const existTrial = await query(
          `SELECT "ProjectID" FROM "MpsiMoldTrial" WHERE "ProjectID" = $1`,
          [pid]
        );

        if (existTrial.rows.length === 0) {
          // 제조(Step 6) 메타 정보가 있는지 보강 조회
          let mfgMeta: any = {};
          try {
            const mfgRes = await query(
              `SELECT "Note", "TargetT1Date" FROM "MpsiMoldManufacture" WHERE "ProjectID" = $1 LIMIT 1`,
              [pid]
            );
            if (mfgRes.rows.length > 0) {
              mfgMeta = JSON.parse(mfgRes.rows[0].Note || "{}");
            }
          } catch (e) {}

          const targetT1 = mfgMeta.targetT1Date || (p.TargetT1Date ? new Date(p.TargetT1Date).toISOString().slice(0, 10) : "2026-11-06");
          
          const initialTrialProject = {
            id: 1,
            projectNo: pid,
            moldNo: mfgMeta.moldNo || `${pid}M`,
            moldDegree: mfgMeta.moldDegree || "M1",
            changeType: mfgMeta.changeType || "N001",
            projectName: mfgMeta.projectName || p.ProjectName || "Door Armrest Base",
            productName: mfgMeta.productName || p.PartName || "Main Part",
            customerName: mfgMeta.customerName || p.CustomerName || "현대자동차 (1차사)",
            moldVendor: mfgMeta.moldVendor || "우성정공(주)",
            massVendor: "(주)뉴몰드",
            cavity: mfgMeta.cavity || "1*2 Cavity",
            material: mfgMeta.material || "NAK80 / KP4M",
            targetT1Date: targetT1,
            currentTrial: "T1",
            transferPlanDate: "2026-12-20",
            transferActualDate: "",
            currentStep: 7,
            updatedAt: new Date().toLocaleString("ko-KR", { hour12: false }).replace(/\./g, "-").slice(0, 16),
            trials: [
              {
                trialDegree: "T1",
                planDate: targetT1,
                trialDate: "",
                inspector: "우성정공 품질팀",
                dimResult: "OK",
                appResult: "OK",
                specResult: "OK",
                cycleTime: 34,
                targetCycleTime: 35,
                status: "육성 진행중",
                mpsiDecision: "검토중",
                checklist: [
                  {
                    id: `chk_init_1`,
                    category: "치수 만족도",
                    description: "T1 성형품 CMM 3차원 정밀 계측 및 핵심공차 검증",
                    isResolved: false,
                  },
                  {
                    id: `chk_init_2`,
                    category: "외관 만족도",
                    description: "외관 웰드라인, 싱크마크, 가스버닝 표면 품질 점검",
                    isResolved: false,
                  }
                ],
                opinion: "금형 제작/습합 완료에 따른 T1 시사출 착수 대기",
              }
            ],
            finalDocuments: createServerDefaultFinalDocs(),
            memoLogs: [
              {
                id: `memo-${Date.now()}`,
                authorId: "MPSI_HQ",
                authorName: "MPSI 시스템",
                company: "MPSI 본사",
                tag: "금형육성착수",
                content: `[시사출/금형육성 자동 연계] 금형제작(Step 6) 단계에서 금형 육성 상태로 전환되어 시사출 관리대장(Step 7)에 신규 등재되었습니다.`,
                createdAt: new Date().toLocaleString("ko-KR", { hour12: false }).replace(/\./g, "-").slice(0, 16),
              }
            ]
          };

          await query(`
            INSERT INTO "MpsiMoldTrial" (
              "TrialID", "ProjectID", "TrialDegree", "TrialDate", "TrialStatus", 
              "MpsiDecision", "CreatorID", "CreationDateTime", "Note"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, NOW(), $8
            )
          `, [
            `TRIAL-${pid}-T1`,
            pid,
            "T1",
            targetT1,
            "육성 진행중",
            "검토중",
            "MPSI_HQ",
            JSON.stringify(initialTrialProject)
          ]);
        }
      }
    } catch (e) {
      console.warn("[Trial GET AutoSync Warning]", e);
    }

    // 2. 조회 실행
    let sql = `
      SELECT 
        t."TrialSequenceNo",
        t."TrialID",
        t."ProjectID",
        t."TrialDegree",
        t."TrialDate",
        t."TrialStatus",
        t."MpsiDecision",
        t."CycleTimeSeconds",
        t."Note",
        t."CreationDateTime"
      FROM "MpsiMoldTrial" t
      ORDER BY t."TrialSequenceNo" ASC
    `;
    let params: any[] = [];
    if (projectId) {
      sql = `
        SELECT 
          t."TrialSequenceNo",
          t."TrialID",
          t."ProjectID",
          t."TrialDegree",
          t."TrialDate",
          t."TrialStatus",
          t."MpsiDecision",
          t."CycleTimeSeconds",
          t."Note",
          t."CreationDateTime"
        FROM "MpsiMoldTrial" t
        WHERE t."ProjectID" = $1
      `;
      params = [projectId];
    }

    let rows: any[] = [];
    try {
      const res = await query(sql, params);
      rows = res.rows;
    } catch (queryErr) {
      console.warn("[Trial GET Query Warning - retrying with SELECT *]", queryErr);
      try {
        const fallbackSql = `SELECT * FROM "MpsiMoldTrial"` + (projectId ? ` WHERE "ProjectID" = $1` : ``);
        const resFallback = await query(fallbackSql, params);
        rows = resFallback.rows;
      } catch (fatalErr) {
        console.error("[Trial GET Fatal DB Query Error]", fatalErr);
        rows = [];
      }
    }

    const items = rows
      .map((r: any) => {
        let meta: any = {};
        try {
          meta = JSON.parse(r.Note || "{}");
        } catch (e) {
          meta = {};
        }

        const projectNo = r.ProjectID || meta.projectNo;

        // 더미 프로젝트 영구 배제
        if (
          projectNo === "MI25001P1" ||
          projectNo === "MI25001P2" ||
          projectNo === "MI26001P0" ||
          projectNo === "MI26002P0" ||
          projectNo === "MI26003P0" ||
          meta.projectName === "현대 NT5" ||
          meta.projectName === "NQ5"
        ) {
          return null;
        }

        return {
          id: Number(r.TrialSequenceNo),
          projectNo: projectNo,
          moldNo: meta.moldNo || (projectNo ? `${projectNo}M` : "-"),
          moldDegree: meta.moldDegree || "M1",
          changeType: meta.changeType || "N001",
          projectName: meta.projectName || "프로젝트",
          productName: meta.productName || "제품",
          customerName: meta.customerName || "고객사",
          moldVendor: meta.moldVendor || "우성정공(주)",
          massVendor: meta.massVendor || "(주)뉴몰드",
          cavity: meta.cavity || "1*2 Cavity",
          material: meta.material || "NAK80 / KP4M",
          targetT1Date: meta.targetT1Date || (r.TrialDate ? new Date(r.TrialDate).toISOString().slice(0, 10) : ""),
          currentTrial: meta.currentTrial || r.TrialDegree || "T1",
          isMoldApproved: Boolean(meta.isMoldApproved),
          transferPlanDate: meta.transferPlanDate || "",
          transferActualDate: meta.transferActualDate || "",
          currentStep: meta.currentStep || 7,
          approvalCertNo: meta.approvalCertNo || undefined,
          approvalCertDate: meta.approvalCertDate || undefined,
          approvedBy: meta.approvedBy || undefined,
          trials: Array.isArray(meta.trials) && meta.trials.length > 0 ? meta.trials : [],
          finalDocuments: Array.isArray(meta.finalDocuments) && meta.finalDocuments.length > 0 ? meta.finalDocuments : createServerDefaultFinalDocs(),
          memoLogs: Array.isArray(meta.memoLogs) ? meta.memoLogs : [],
          updatedAt: meta.updatedAt || new Date().toLocaleString("ko-KR"),
        };
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    console.error("[API mold-dev/trials GET Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch mold trials" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { projectNo, trialData } = body;

    if (!projectNo) {
      return NextResponse.json({ success: false, error: "projectNo is required" }, { status: 400 });
    }

    const existing = await query(
      `SELECT "TrialSequenceNo", "Note" FROM "MpsiMoldTrial" WHERE "ProjectID" = $1`,
      [projectNo]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Trial project not found" }, { status: 404 });
    }

    const seqNo = existing.rows[0].TrialSequenceNo;
    const nowStr = new Date().toLocaleString("ko-KR", { hour12: false }).replace(/\./g, "-").slice(0, 16);

    const merged = {
      ...trialData,
      updatedAt: nowStr,
    };

    await query(`
      UPDATE "MpsiMoldTrial"
      SET 
        "TrialDegree" = $1,
        "TrialStatus" = $2,
        "Note" = $3,
        "CreationDateTime" = NOW()
      WHERE "TrialSequenceNo" = $4
    `, [
      merged.currentTrial || "T1",
      merged.isMoldApproved ? "양산승인완료" : "육성 진행중",
      JSON.stringify(merged),
      seqNo
    ]);

    // ProjectMaster 공정 상태 동기화
    try {
      const nextStage = merged.isMoldApproved ? "Step 9: 금형 승인 및 이관" : "Step 7: T1 시사출 및 육성";
      await query(`
        UPDATE "ProjectMaster"
        SET 
          "CurrentProcessStage" = $1,
          "ModificationDateTime" = NOW()
        WHERE "ProjectID" = $2
      `, [nextStage, projectNo]);
    } catch (e) {
      console.warn("[Trial PUT ProjectMaster sync warning]", e);
    }

    return NextResponse.json({ success: true, message: "Trial updated successfully", data: merged });
  } catch (error: any) {
    console.error("[API mold-dev/trials PUT Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update mold trial" },
      { status: 500 }
    );
  }
}
