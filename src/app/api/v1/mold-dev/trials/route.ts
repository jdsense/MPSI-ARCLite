import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// 5대 필수 서류 기본 템플릿 (서버용)
export function createServerDefaultFinalDocs() {
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

export function createInitialTrialRecord(
  pid: string, 
  mfgMeta: any = {}, 
  pmMeta: any = {}, 
  projectName: string = "양산 프로젝트",
  mqMeta: any = {}
) {
  const targetT1 = mfgMeta.targetT1Date || mqMeta.targetT1Date || pmMeta.targetT1Date || "2026-11-20";
  let rawCavity = mqMeta.cavity || mfgMeta.cavity || pmMeta.cavity;
  if (rawCavity && !rawCavity.includes("Cavity")) rawCavity = `${rawCavity} Cavity`;
  const actualCavity = rawCavity || "1*2 Cavity";

  const actualMaterial = mqMeta.moldMaterial || mqMeta.moldSteel || mfgMeta.material || pmMeta.material || pmMeta.resinSpec || "SKD61";
  const actualMoldNo = pmMeta.moldNo || mfgMeta.moldNo || (pid ? `${pid.replace(/P0$/, "")}M` : "-");

  return {
    id: 1,
    projectNo: pid,
    moldNo: actualMoldNo,
    moldDegree: mfgMeta.moldDegree || mqMeta.moldDegree || pmMeta.moldDegree || "M1",
    changeType: mfgMeta.changeType || mqMeta.changeType || pmMeta.changeType || "N001",
    projectName: mfgMeta.projectName || mqMeta.projectName || pmMeta.projectName || projectName,
    productName: mfgMeta.productName || pmMeta.productName || mqMeta.productName || projectName || "사출 성형 부품",
    customerName: mfgMeta.customerName || pmMeta.customerName || mqMeta.customerName || "원청 고객사",
    moldVendor: mfgMeta.moldVendor || mqMeta.vendorName || pmMeta.moldVendor || "우성정공(주)",
    massVendor: mfgMeta.massVendor || pmMeta.massVendor || "(주)뉴몰드",
    cavity: actualCavity,
    material: actualMaterial,
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
        authorName: "MPSI",
        company: "MPSI",
        tag: "금형육성착수",
        content: `[시사출/금형육성 자동 연계] 금형제작(Step 6) 단계에서 금형 육성 상태로 전환되어 시사출 관리대장(Step 7)에 신규 등재되었습니다.`,
        createdAt: new Date().toLocaleString("ko-KR", { hour12: false }).replace(/\./g, "-").slice(0, 16),
      }
    ]
  };
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

    // 조회 실행 (GET 요청에서는 INSERT를 일절 수행하지 않아, 사용자가 DB에서 삭제한 데이터가 새로고침 시 되살아나는 것을 방지)
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

    const pids = Array.from(new Set(rows.map((r: any) => r.ProjectID).filter(Boolean)));
    const pmMap: Record<string, any> = {};
    const mqMap: Record<string, any> = {};
    const mfgMap: Record<string, any> = {};

    if (pids.length > 0) {
      try {
        const pmRes = await query(
          `SELECT "ProjectID", "ProjectName", "Note" FROM "ProjectMaster" WHERE "ProjectID" = ANY($1)`,
          [pids]
        );
        for (const pr of pmRes.rows) {
          let pNote: any = {};
          try { pNote = JSON.parse(pr.Note || "{}"); } catch {}
          pmMap[pr.ProjectID] = {
            ...pNote,
            projectNameCol: pr.ProjectName,
          };
        }
      } catch (pmErr) {
        console.warn("[Trial GET pmMap Warning]", pmErr);
      }

      try {
        const mqRes = await query(
          `SELECT "ProjectID", "FinalNegotiatedAmount", "Note" FROM "MpsiMoldQuotation" WHERE "ProjectID" = ANY($1)`,
          [pids]
        );
        for (const qr of mqRes.rows) {
          let qNote: any = {};
          try { qNote = JSON.parse(qr.Note || "{}"); } catch {}
          mqMap[qr.ProjectID] = {
            ...qNote,
            finalAmount: Number(qr.FinalNegotiatedAmount || 0),
          };
        }
      } catch (mqErr) {
        console.warn("[Trial GET mqMap Warning]", mqErr);
      }

      try {
        const mfgRes = await query(
          `SELECT "ProjectID", "Note" FROM "MpsiMoldManufacture" WHERE "ProjectID" = ANY($1)`,
          [pids]
        );
        for (const mr of mfgRes.rows) {
          let mNote: any = {};
          try { mNote = JSON.parse(mr.Note || "{}"); } catch {}
          mfgMap[mr.ProjectID] = mNote;
        }
      } catch (mfgErr) {
        console.warn("[Trial GET mfgMap Warning]", mfgErr);
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

        // 유효하지 않은 항목만 제외 (실제 프로젝트 MI26001 등은 정상 표출)
        if (!projectNo || projectNo === "DUMMY" || projectNo === "undefined") {
          return null;
        }

        const pmInfo = pmMap[projectNo] || {};
        const mqInfo = mqMap[projectNo] || {};
        const mfgInfo = mfgMap[projectNo] || {};

        let rawCavity = mqInfo.cavity || mfgInfo.cavity || pmInfo.cavity || (meta.cavity && meta.cavity !== "1*2 Cavity" ? meta.cavity : null);
        if (rawCavity && !rawCavity.includes("Cavity")) rawCavity = `${rawCavity} Cavity`;
        const actualCavity = rawCavity || meta.cavity || "1*2 Cavity";

        const actualMaterial = mqInfo.moldMaterial || mqInfo.moldSteel || mfgInfo.material || pmInfo.material || (meta.material && meta.material !== "NAK80 / KP4M" ? meta.material : "SKD61");
        const actualMoldNo = pmInfo.moldNo || mfgInfo.moldNo || (meta.moldNo && !meta.moldNo.endsWith("P0M") ? meta.moldNo : `${projectNo.replace(/P0$/, "")}M`);
        const actualDegree = pmInfo.moldDegree || mqInfo.moldDegree || mfgInfo.moldDegree || meta.moldDegree || "M1";
        const actualChange = pmInfo.changeType || mqInfo.changeType || mfgInfo.changeType || meta.changeType || "N001";
        const actualProjectName = pmInfo.projectName || mqInfo.projectName || mfgInfo.projectName || meta.projectName || "프로젝트";
        const actualProductName = pmInfo.productName || pmInfo.projectNameCol || mqInfo.productName || mfgInfo.productName || meta.productName || "제품";
        const actualCustomer = pmInfo.customerName || mqInfo.customerName || mfgInfo.customerName || meta.customerName || "고객사";
        const actualVendor = mqInfo.vendorName || mfgInfo.moldVendor || pmInfo.moldVendor || meta.moldVendor || "우성정공(주)";
        const actualMassVendor = mfgInfo.massVendor || pmInfo.massVendor || meta.massVendor || "(주)뉴몰드";

        return {
          id: Number(r.TrialSequenceNo),
          projectNo: projectNo,
          moldNo: actualMoldNo,
          moldDegree: actualDegree,
          changeType: actualChange,
          projectName: actualProjectName,
          productName: actualProductName,
          customerName: actualCustomer,
          moldVendor: actualVendor,
          massVendor: actualMassVendor,
          cavity: actualCavity,
          material: actualMaterial,
          targetT1Date: meta.targetT1Date || (r.TrialDate ? String(r.TrialDate).slice(0, 10) : (mfgInfo.targetT1Date || "")),
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
    await ensureTrialSchema();
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

    // 금형 승인 또는 이관 완료 시 시양산(MpsiMassValidation)의 moldTransferConfirmed 동기화
    if (merged.isMoldApproved || merged.transferActualDate || merged.currentStep >= 10) {
      try {
        const valRes = await query(`SELECT "ValidationSequenceNo", "Note" FROM "MpsiMassValidation" WHERE "ProjectID" = $1`, [projectNo]);
        if (valRes.rows.length > 0) {
          let vNote: any = {};
          try { vNote = JSON.parse(valRes.rows[0].Note || "{}"); } catch {}
          vNote.moldTransferConfirmed = true;
          if (merged.transferActualDate) vNote.moldTransferDate = merged.transferActualDate;
          await query(
            `UPDATE "MpsiMassValidation" SET "Note" = $1, "ModificationDateTime" = NOW() WHERE "ValidationSequenceNo" = $2`,
            [JSON.stringify(vNote), valRes.rows[0].ValidationSequenceNo]
          );
        }
      } catch (e) {
        console.warn("[Trial PUT MassValidation sync warning]", e);
      }
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

export async function POST(req: Request) {
  try {
    await ensureTrialSchema();
    const body = await req.json().catch(() => ({}));
    const { action, projectNo } = body;

    // 수동/명시적 동기화 요청:
    // MpsiMoldManufacture에서 실제로 '금형 육성 중' 상태이거나 currentStep >= 7인 건만 선별하여 MpsiMoldTrial에 등재
    if (action === "sync" || !action) {
      let mfgSql = `
        SELECT "ProjectID", "Note", "ManufactureStatus", "TargetT1Date"
        FROM "MpsiMoldManufacture"
        WHERE "ManufactureStatus" = '금형 육성 중'
      `;
      let params: any[] = [];
      if (projectNo) {
        mfgSql += ` AND "ProjectID" = $1`;
        params.push(projectNo);
      }

      const mfgRes = await query(mfgSql, params);
      let enrolledCount = 0;

      for (const mfg of mfgRes.rows) {
        const pid = mfg.ProjectID;
        if (!pid || pid === "DUMMY") continue;

        const existTrial = await query(
          `SELECT "ProjectID" FROM "MpsiMoldTrial" WHERE "ProjectID" = $1`,
          [pid]
        );

        if (existTrial.rows.length === 0) {
          let mfgMeta: any = {};
          try { mfgMeta = JSON.parse(mfg.Note || "{}"); } catch {}

          let pmMeta: any = {};
          let projectName = "양산 프로젝트";
          try {
            const pmRes = await query(`SELECT "ProjectName", "Note" FROM "ProjectMaster" WHERE "ProjectID" = $1`, [pid]);
            if (pmRes.rows.length > 0) {
              projectName = pmRes.rows[0].ProjectName || projectName;
              pmMeta = JSON.parse(pmRes.rows[0].Note || "{}");
            }
          } catch {}

          const initialTrialProject = createInitialTrialRecord(pid, mfgMeta, pmMeta, projectName);
          const targetT1 = mfgMeta.targetT1Date || initialTrialProject.targetT1Date;

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
          enrolledCount++;
        }
      }

      return NextResponse.json({ success: true, message: `동기화 완료: ${enrolledCount}건 등재`, enrolledCount });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[API mold-dev/trials POST Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process POST" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureTrialSchema();
    const { searchParams } = new URL(req.url);
    const projectNo = searchParams.get("projectNo") || searchParams.get("projectId");
    const trialId = searchParams.get("trialId");
    const seqNo = searchParams.get("seqNo");

    if (!projectNo && !trialId && !seqNo) {
      return NextResponse.json({ success: false, error: "삭제할 projectNo, trialId 또는 seqNo가 필요합니다." }, { status: 400 });
    }

    let delSql = `DELETE FROM "MpsiMoldTrial" WHERE `;
    const params: any[] = [];
    if (seqNo) {
      delSql += `"TrialSequenceNo" = $1`;
      params.push(Number(seqNo));
    } else if (projectNo) {
      delSql += `"ProjectID" = $1`;
      params.push(projectNo);
    } else if (trialId) {
      delSql += `"TrialID" = $1`;
      params.push(trialId);
    }

    const res = await query(delSql, params);
    return NextResponse.json({ success: true, message: "Deleted successfully", rowCount: res.rowCount });
  } catch (error: any) {
    console.error("[API mold-dev/trials DELETE Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete mold trial" },
      { status: 500 }
    );
  }
}
