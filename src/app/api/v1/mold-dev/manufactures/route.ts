import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createInitialTrialRecord } from "../trials/route";

// 7대 핵심 공정 기본 템플릿
const DEFAULT_PROCESSES = [
  { code: "GUN", name: "건드릴(냉각홀)", planDate: "11-08", actualDate: "", progress: 0, status: "대기" },
  { code: "ML", name: "황삭 밀링", planDate: "11-12", actualDate: "", progress: 0, status: "대기" },
  { code: "HT", name: "코어 열처리", planDate: "11-16", actualDate: "", progress: 0, status: "대기" },
  { code: "CNC", name: "CNC 정밀가공", planDate: "11-22", actualDate: "", progress: 0, status: "대기" },
  { code: "PL", name: "방전(EDM)", planDate: "11-27", actualDate: "", progress: 0, status: "대기" },
  { code: "WR", name: "와이어컷", planDate: "12-02", actualDate: "", progress: 0, status: "대기" },
  { code: "ASSY", name: "금형 조립/래핑", planDate: "12-08", actualDate: "", progress: 0, status: "대기" },
];

let mfgSchemaEnsured = false;
async function ensureManufactureSchema() {
  if (mfgSchemaEnsured) return;
  try {
    await query(`
      ALTER TABLE IF EXISTS "MpsiMoldManufacture" 
        ADD COLUMN IF NOT EXISTS "Note" TEXT,
        ADD COLUMN IF NOT EXISTS "ModificationDateTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    mfgSchemaEnsured = true;
  } catch (e) {
    console.warn("[Manufacture Schema Warning]", e);
  }
}

export async function GET(req: Request) {
  try {
    await ensureManufactureSchema();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    // 1. MpsiMoldDesign에서 Step 4(발주 완료) 및 Step 5~6(금형 설계 승인/소재발주)된 실제 프로젝트 자동 동기화 확인
    try {
      const designRows = await query(`
        SELECT "ProjectID", "DesignReviewStatus", "DesignApprovalStatus", "Note" 
        FROM "MpsiMoldDesign"
      `);

      for (const d of designRows.rows) {
        let meta: any = {};
        try {
          meta = JSON.parse(d.Note || "{}");
        } catch (e) {}

        const pid = d.ProjectID || meta.projectNo;
        if (!pid || pid === "DUMMY") continue;

        // 금형 발주 완료(moldPoApproved), 금형 설계 승인(검토완료), 또는 소재발주 승인 상태인 경우 제작 대장에 자동 등재
        const isDesignDone = d.DesignApprovalStatus === "검토완료" || meta.moldDesignStatus === "검토완료";
        const isApprovedForManufacture = 
          meta.moldPoApproved === true ||
          isDesignDone ||
          meta.materialOrderStatus === "승인완료" ||
          (meta.currentStep && meta.currentStep >= 5);

        if (!isApprovedForManufacture) {
          continue;
        }

        // MpsiMoldManufacture에 이미 있는지 확인
        const existMfg = await query(`SELECT "ProjectID", "Note" FROM "MpsiMoldManufacture" WHERE "ProjectID" = $1`, [pid]);
        if (existMfg.rows.length === 0) {
          const currentMfgStatus = "미입력";
          const currentStep = 5;

          const initNote = {
            id: 1,
            projectNo: pid,
            moldNo: meta.moldNo || `${pid}M`,
            moldDegree: meta.moldDegree || "M1",
            changeType: meta.changeType || "N001",
            projectName: meta.projectName || "양산 신차 프로젝트",
            productName: meta.productName || "Main Mold Part",
            customerName: meta.customerName || "원청사",
            moldVendor: meta.moldVendor || "우성정공(주)",
            cavity: meta.cavity || "1*2 Cavity",
            material: meta.material || "NAK80 / KP4M",
            targetT1Date: meta.targetT1Date || "2026-11-06",
            moldDeliveryDate: meta.moldDeliveryDate || meta.targetT1Date || "2026-12-15",
            moldPoNo: meta.moldPoNo || `MOLD-PO-${pid}`,
            orderDate: meta.moldPoApprovedDate ? meta.moldPoApprovedDate.split(" ")[0] : new Date().toISOString().split("T")[0],
            orderAmount: Number(meta.moldPoAmount || 0),
            manufactureStatus: currentMfgStatus,
            scheduleFile: null,
            memoLogs: [
              {
                id: `memo-${Date.now()}`,
                authorId: "MPSI_HQ",
                authorName: "MPSI",
                company: "MPSI",
                tag: isDesignDone ? "설계승인완료" : "금형발주완료",
                content: isDesignDone
                  ? `[금형설계 승인 연동] 금형 3D 설계 승인이 완료되어 금형제작 일정 관제 대장에 정식 등재되었습니다. (가공 착수)`
                  : `[금형제작 착수 연동] 금형발주(PO: ${meta.moldPoNo || `MOLD-PO-${pid}`})가 승인되어 금형제작 일정 관제 대장에 정식 등재되었습니다.`,
                createdAt: new Date().toLocaleString("ko-KR", { hour12: false }).replace(/\./g, "-").slice(0, 16)
              }
            ],
            processes: DEFAULT_PROCESSES,
            overallProgress: 0,
            coreStatus: "대기",
            coreProgress: 0,
            assyStatus: "대기",
            assyProgress: 0,
            scheduleStatus: "정상",
            currentStep: currentStep,
            updatedAt: new Date().toLocaleString("ko-KR", { hour12: false }).replace(/\./g, "-").slice(0, 16),
            notes: isDesignDone ? "금형 3D 설계 승인 완료, 공정 가공 착수 대기" : "MPSI 발주 승인 완료, 금형 제작 일정표 엑셀 업로드 대기"
          };

          await query(`
            INSERT INTO "MpsiMoldManufacture" (
              "ManufactureID", "ProjectID", "MoldPoNo", "OrderAmount", "OrderDate", 
              "TargetT1Date", "MoldDeliveryDate", "OverallProgressRate", "ManufactureStatus", 
              "CreatorID", "CreationDateTime", "Note"
            ) OVERRIDING USER VALUE VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11
            )
          `, [
            `MFG-${pid}`,
            pid,
            meta.moldPoNo || `MOLD-PO-${pid}`,
            Number(meta.moldPoAmount || 0),
            meta.moldPoApprovedDate ? meta.moldPoApprovedDate.split(" ")[0] : new Date().toISOString().split("T")[0],
            meta.targetT1Date || "2026-11-06",
            meta.moldDeliveryDate || meta.targetT1Date || "2026-12-15",
            0,
            currentMfgStatus,
            "MPSI_HQ",
            JSON.stringify(initNote)
          ]);
        } else {
          // 이미 존재하지만 설계 승인이 새로 되었을 경우 상태 갱신
          const isDesignDone = d.DesignApprovalStatus === "검토완료" || meta.moldDesignStatus === "검토완료";
          if (isDesignDone) {
            let existingNote: any = {};
            try { existingNote = JSON.parse(existMfg.rows[0].Note || "{}"); } catch {}
            if (existingNote.scheduleFile && (existingNote.manufactureStatus === "금형 설계 중" || existingNote.manufactureStatus === "미입력")) {
              existingNote.manufactureStatus = "가공 중";
              existingNote.currentStep = 6;
              existingNote.updatedAt = new Date().toLocaleString("ko-KR", { hour12: false }).replace(/\./g, "-").slice(0, 16);
              existingNote.memoLogs = [
                {
                  id: `memo-${Date.now()}`,
                  authorId: "MPSI_HQ",
                  authorName: "MPSI",
                  company: "MPSI",
                  tag: "설계승인완료",
                  content: `[금형설계 승인 연동] 금형 3D 설계 검토가 완료되어 제작 상태가 '가공 중'으로 전환되었습니다.`,
                  createdAt: new Date().toLocaleString("ko-KR", { hour12: false }).replace(/\./g, "-").slice(0, 16)
                },
                ...(existingNote.memoLogs || [])
              ];
              await query(
                `UPDATE "MpsiMoldManufacture" 
                 SET "ManufactureStatus" = '가공 중', "Note" = $1, "ModificationDateTime" = NOW() 
                 WHERE "ProjectID" = $2`,
                [JSON.stringify(existingNote), pid]
              );
            }
          }
        }
      }
    } catch (e) {
      console.warn("[Manufacture GET AutoSync Warning]", e);
    }

    // 2. 조회 쿼리 실행
    let sql = `
      SELECT 
        m."ManufactureSequenceNo",
        m."ManufactureID",
        m."ProjectID",
        m."MoldPoNo",
        m."OrderAmount",
        m."OrderDate",
        m."TargetT1Date",
        m."MoldDeliveryDate",
        m."OverallProgressRate",
        m."GunDrillProgress",
        m."MillingProgress",
        m."HeatTreatmentProgress",
        m."CncMachiningProgress",
        m."EdmProgress",
        m."PolishingProgress",
        m."AssemblyProgress",
        m."ManufactureStatus",
        m."Note",
        m."CreationDateTime",
        m."ModificationDateTime"
      FROM "MpsiMoldManufacture" m
      ORDER BY m."ManufactureSequenceNo" ASC
    `;
    let params: any[] = [];
    if (projectId) {
      sql = `
        SELECT 
          m."ManufactureSequenceNo",
          m."ManufactureID",
          m."ProjectID",
          m."MoldPoNo",
          m."OrderAmount",
          m."OrderDate",
          m."TargetT1Date",
          m."MoldDeliveryDate",
          m."OverallProgressRate",
          m."GunDrillProgress",
          m."MillingProgress",
          m."HeatTreatmentProgress",
          m."CncMachiningProgress",
          m."EdmProgress",
          m."PolishingProgress",
          m."AssemblyProgress",
          m."ManufactureStatus",
          m."Note",
          m."CreationDateTime",
          m."ModificationDateTime"
        FROM "MpsiMoldManufacture" m
        WHERE m."ProjectID" = $1
      `;
      params = [projectId];
    }

    let rows: any[] = [];
    try {
      const res = await query(sql, params);
      rows = res.rows;
    } catch (queryErr) {
      console.warn("[Manufacture GET Query Warning - retrying with SELECT *]", queryErr);
      try {
        const fallbackSql = `SELECT * FROM "MpsiMoldManufacture"` + (projectId ? ` WHERE "ProjectID" = $1` : ``);
        const resFallback = await query(fallbackSql, params);
        rows = resFallback.rows;
      } catch (fatalErr) {
        console.error("[Manufacture GET Fatal DB Query Error]", fatalErr);
        rows = [];
      }
    }

    // DTO 변환
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

        const overallProgress = Number(r.OverallProgressRate ?? meta.overallProgress ?? 0);
        let manufactureStatus = r.ManufactureStatus || meta.manufactureStatus || "미입력";
        const hasSchedule = Boolean(meta.scheduleFile && (meta.scheduleFile.fileName || meta.scheduleFile.fileUrl));
        // 일정표 엑셀이 업로드되지 않은 초기 등재 상태의 경우 "미입력" 상태 보장
        if (!hasSchedule && (!meta.manufactureStatus || meta.manufactureStatus === "미입력" || r.ManufactureStatus === "가공 중" || meta.manufactureStatus === "가공 중" || meta.manufactureStatus === "금형 설계 중")) {
          manufactureStatus = "미입력";
        }

        return {
          id: Number(r.ManufactureSequenceNo),
          projectNo: projectNo,
          moldNo: meta.moldNo || (projectNo ? `${projectNo}M` : "-"),
          moldDegree: meta.moldDegree || "M1",
          changeType: meta.changeType || "N001",
          projectName: meta.projectName || "프로젝트",
          productName: meta.productName || "제품",
          customerName: meta.customerName || "고객사",
          moldVendor: meta.moldVendor || "우성정공(주)",
          cavity: meta.cavity || "1*2 Cavity",
          material: meta.material || "NAK80 / KP4M",
          targetT1Date: r.TargetT1Date ? String(r.TargetT1Date).slice(0, 10) : (meta.targetT1Date || ""),
          moldDeliveryDate: r.MoldDeliveryDate ? String(r.MoldDeliveryDate).slice(0, 10) : (meta.moldDeliveryDate || ""),
          moldPoNo: r.MoldPoNo || meta.moldPoNo || "-",
          orderDate: r.OrderDate ? String(r.OrderDate).slice(0, 10) : (meta.orderDate || ""),
          orderAmount: Number(r.OrderAmount ?? meta.orderAmount ?? 0),
          manufactureStatus: manufactureStatus,
          scheduleFile: meta.scheduleFile || undefined,
          memoLogs: Array.isArray(meta.memoLogs) ? meta.memoLogs : [],
          coreStatus: meta.coreStatus || (overallProgress > 50 ? "코어가공완료" : overallProgress > 0 ? "코어가공중" : "대기"),
          coreProgress: Number(meta.coreProgress ?? overallProgress),
          assyStatus: meta.assyStatus || (overallProgress > 80 ? "금형조립중" : "대기"),
          assyProgress: Number(meta.assyProgress ?? 0),
          overallProgress: overallProgress,
          scheduleStatus: meta.scheduleStatus || "정상",
          currentStep: meta.currentStep || 6,
          processes: Array.isArray(meta.processes) && meta.processes.length > 0 ? meta.processes : DEFAULT_PROCESSES,
          updatedAt: meta.updatedAt || (r.ModificationDateTime ? new Date(r.ModificationDateTime).toLocaleString("ko-KR") : new Date().toLocaleString("ko-KR")),
          notes: meta.notes || "",
          newmoldPreShare: Boolean(meta.newmoldPreShare),
          moldDesignFile: meta.moldDesignFile || "",
        };
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    console.error("[API mold-dev/manufactures GET Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch mold manufactures" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    await ensureManufactureSchema();
    const body = await req.json();
    const {
      projectNo,
      manufactureStatus,
      processes,
      overallProgress,
      scheduleFile,
      memoLogs,
      notes,
      coreProgress,
      assyProgress,
      targetT1Date,
      moldDeliveryDate,
    } = body;

    if (!projectNo) {
      return NextResponse.json({ success: false, error: "projectNo is required" }, { status: 400 });
    }

    // 1. 기존 데이터 조회
    const existing = await query(`
      SELECT "ManufactureSequenceNo", "Note", "ManufactureStatus"
      FROM "MpsiMoldManufacture"
      WHERE "ProjectID" = $1
    `, [projectNo]);

    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Project manufacture not found" }, { status: 404 });
    }

    const currentSeq = existing.rows[0].ManufactureSequenceNo;
    let meta: any = {};
    try {
      meta = JSON.parse(existing.rows[0].Note || "{}");
    } catch (e) {
      meta = {};
    }

    // 2. 메타데이터 업데이트 병합
    const nowStr = new Date().toLocaleString("ko-KR", { hour12: false }).replace(/\./g, "-").slice(0, 16);
    
    if (manufactureStatus !== undefined) meta.manufactureStatus = manufactureStatus;
    if (processes !== undefined) meta.processes = processes;
    if (overallProgress !== undefined) meta.overallProgress = overallProgress;
    if (scheduleFile !== undefined) meta.scheduleFile = scheduleFile;
    if (memoLogs !== undefined) meta.memoLogs = memoLogs;
    if (notes !== undefined) meta.notes = notes;
    if (coreProgress !== undefined) meta.coreProgress = coreProgress;
    if (assyProgress !== undefined) meta.assyProgress = assyProgress;
    if (targetT1Date !== undefined) meta.targetT1Date = targetT1Date;
    if (moldDeliveryDate !== undefined) meta.moldDeliveryDate = moldDeliveryDate;
    meta.updatedAt = nowStr;

    // 공정별 진행률 추출
    let gunProgress = 0;
    let mlProgress = 0;
    let htProgress = 0;
    let cncProgress = 0;
    let edmProgress = 0;
    let wrProgress = 0;
    let assyProg = 0;

    if (Array.isArray(processes)) {
      processes.forEach((p: any) => {
        if (p.code === "GUN") gunProgress = p.progress || 0;
        if (p.code === "ML") mlProgress = p.progress || 0;
        if (p.code === "HT") htProgress = p.progress || 0;
        if (p.code === "CNC") cncProgress = p.progress || 0;
        if (p.code === "PL") edmProgress = p.progress || 0;
        if (p.code === "WR") wrProgress = p.progress || 0;
        if (p.code === "ASSY") assyProg = p.progress || 0;
      });
    }

    const nextOverallProgress = overallProgress ?? meta.overallProgress ?? 0;
    const nextStatus = manufactureStatus || existing.rows[0].ManufactureStatus || "미입력";

    // 3. PostgreSQL DB 업데이트
    await query(`
      UPDATE "MpsiMoldManufacture"
      SET 
        "ManufactureStatus" = $1,
        "OverallProgressRate" = $2,
        "GunDrillProgress" = $3,
        "MillingProgress" = $4,
        "HeatTreatmentProgress" = $5,
        "CncMachiningProgress" = $6,
        "EdmProgress" = $7,
        "PolishingProgress" = $8,
        "AssemblyProgress" = $9,
        "Note" = $10,
        "ModifierID" = 'SYSTEM_USER',
        "ModificationDateTime" = NOW()
      WHERE "ManufactureSequenceNo" = $11
    `, [
      nextStatus,
      nextOverallProgress,
      gunProgress,
      mlProgress,
      htProgress,
      cncProgress,
      edmProgress,
      wrProgress,
      assyProg,
      JSON.stringify(meta),
      currentSeq
    ]);

    // 4. ProjectMaster와도 동기화 (CurrentProcessStage 및 진척)
    try {
      await query(`
        UPDATE "ProjectMaster"
        SET 
          "CurrentProcessStage" = 'Step 6: 금형 가공착수',
          "ModificationDateTime" = NOW()
        WHERE "ProjectID" = $1
      `, [projectNo]);
    } catch (e) {
      console.warn("[Manufacture PUT ProjectMaster sync warning]", e);
    }

    // 5. '금형 육성 중' 상태로 전환 시 시사출 대장(MpsiMoldTrial, Step 7)에 신규 연계 등재
    if (nextStatus === "금형 육성 중") {
      try {
        const existTrial = await query(`SELECT "ProjectID" FROM "MpsiMoldTrial" WHERE "ProjectID" = $1`, [projectNo]);
        if (existTrial.rows.length === 0) {
          let pmMeta: any = {};
          let projectName = "양산 프로젝트";
          try {
            const pmRes = await query(`SELECT "ProjectName", "Note" FROM "ProjectMaster" WHERE "ProjectID" = $1`, [projectNo]);
            if (pmRes.rows.length > 0) {
              projectName = pmRes.rows[0].ProjectName || projectName;
              pmMeta = JSON.parse(pmRes.rows[0].Note || "{}");
            }
          } catch {}

          const initialTrialProject = createInitialTrialRecord(projectNo, meta, pmMeta, projectName);
          const targetT1 = meta.targetT1Date || initialTrialProject.targetT1Date;

          await query(`
            INSERT INTO "MpsiMoldTrial" (
              "TrialID", "ProjectID", "TrialDegree", "TrialDate", "TrialStatus", 
              "MpsiDecision", "CreatorID", "CreationDateTime", "Note"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, NOW(), $8
            )
          `, [
            `TRIAL-${projectNo}-T1`,
            projectNo,
            "T1",
            targetT1,
            "육성 진행중",
            "검토중",
            "MPSI_HQ",
            JSON.stringify(initialTrialProject)
          ]);
        }
      } catch (trialSyncErr) {
        console.warn("[Manufacture PUT Trial Sync Warning]", trialSyncErr);
      }
    }

    return NextResponse.json({ success: true, message: "Updated successfully", data: meta });
  } catch (error: any) {
    console.error("[API mold-dev/manufactures PUT Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update mold manufacture" },
      { status: 500 }
    );
  }
}

