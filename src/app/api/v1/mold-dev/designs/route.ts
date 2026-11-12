// src/app/api/v1/mold-dev/designs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { DrawingDesignItem, ProductReviewStatus, MoldDesignReviewStatus } from '@/lib/mold-design-store';
import { syncDownstreamToProjectMaster } from '@/lib/project-master-sync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let isNoteChecked = false;
async function ensureNoteColumn() {
  if (isNoteChecked) return;
  try {
    await query(`ALTER TABLE "MpsiMoldDesign" ADD COLUMN IF NOT EXISTS "Note" TEXT;`);
    isNoteChecked = true;
  } catch {
    isNoteChecked = true;
  }
}

function mapRowToDesignItem(row: any): DrawingDesignItem {
  let note: any = {};
  if (row.Note) {
    try {
      note = typeof row.Note === 'string' ? JSON.parse(row.Note) : row.Note;
    } catch {
      note = {};
    }
  }

  const updatedDateStr = row.ApprovedDateTime
    ? (row.ApprovedDateTime instanceof Date ? row.ApprovedDateTime.toISOString().replace('T', ' ').substring(0, 16) : String(row.ApprovedDateTime).substring(0, 16))
    : (row.CreationDateTime instanceof Date ? row.CreationDateTime.toISOString().replace('T', ' ').substring(0, 16) : String(row.CreationDateTime).substring(0, 16));

  return {
    id: Number(row.DesignSequenceNo),
    projectNo: row.ProjectID || row.DesignID,
    moldNo: note.moldNo || (row.ProjectID ? `${row.ProjectID}M` : ''),
    moldDegree: note.moldDegree || 'M1',
    changeType: note.changeType || 'N001',
    projectName: note.projectName || '',
    productName: note.productName || '',
    customerName: note.customerName || '',
    moldVendor: note.moldVendor || '우성정공(주)',
    targetT1Date: note.targetT1Date || '',
    targetMfgDays: note.targetMfgDays || 40,
    currentStep: note.currentStep || 1,
    updatedAt: note.updatedAt || updatedDateStr,

    // Step 1~4: 제품검토 현황 및 3대 핵심 파일함
    drStatus: (row.DesignReviewStatus as ProductReviewStatus) || (note.drStatus as ProductReviewStatus) || '검토 대기',
    product3DFile: row.Product3DModelFile || note.product3DFile || '',
    product3DNote: note.product3DNote || '',
    moldMeetingReportFile: row.DfmReportFile || note.moldMeetingReportFile || '',
    moldMeetingReportNote: note.moldMeetingReportNote || '',
    caeReportFile: row.CaeAnalysisFile || note.caeReportFile || '',
    caeReportNote: note.caeReportNote || '',

    // Step 4: 금형 발주서
    moldPoNo: note.moldPoNo,
    moldPoAmount: note.moldPoAmount,
    moldPoDays: note.moldPoDays,
    moldPoShot: note.moldPoShot,
    moldPoFile: note.moldPoFile || '',
    moldPoFileNote: note.moldPoFileNote || '',
    moldPoAttached: note.moldPoAttached,
    moldPoApproved: note.moldPoApproved,
    moldPoApprovedDate: note.moldPoApprovedDate,

    // Step 5: 금형설계 현황 및 3D Data
    moldDesignStatus: (row.DesignApprovalStatus as MoldDesignReviewStatus) || (note.moldDesignStatus as MoldDesignReviewStatus) || '검토 대기',
    mold3DDataFile: row.Mold3DModelFile || note.mold3DDataFile || '',
    mold3DDataNote: note.mold3DDataNote || '',

    // Step 6: 소재 발주 승인
    materialOrderStatus: note.materialOrderStatus || '미승인',
    materialOrderApprover: note.materialOrderApprover,
    materialOrderApprovedDate: note.materialOrderApprovedDate,
    materialOrderNote: note.materialOrderNote,

    // 업무 이력 메모 (로그)
    workLogs: note.workLogs || [],

    // 호환성 필드
    drawing2DFile: note.drawing2DFile,
    drawing3DFile: note.drawing3DFile,
    caeEngineer: note.caeEngineer,
  };
}

// 1. 설계 관리대장 목록 조회 (GET)
// + 금형 견적 관리에서 '수주확정'된 프로젝트를 자동으로 MpsiMoldDesign에 동기화 등재
export async function GET(request: NextRequest) {
  try {
    await ensureNoteColumn();

    // 1-1. MpsiMoldQuotation에서 '수주확정'된 건들을 확인하여 MpsiMoldDesign에 실제 DB 데이터로 동기화 등재
    try {
      const confirmedQuotes = await query(
        `SELECT "QuotationID", "ProjectID", "MoldVendorID", "TotalQuotationAmount", "FinalNegotiatedAmount", "TargetMoldDays", "Note", "CreationDateTime" 
         FROM "MpsiMoldQuotation" 
         WHERE "QuotationStatus" = '수주확정'`
      );

      for (const qRow of confirmedQuotes.rows) {
        const pjtId = qRow.ProjectID || qRow.QuotationID;
        let qNote: any = {};
        if (qRow.Note) {
          try { qNote = typeof qRow.Note === 'string' ? JSON.parse(qRow.Note) : qRow.Note; } catch {}
        }

        // 실제 수주확정 견적 데이터 추출 (하드코딩 더미 배제)
        const actualPoAmount = Number(qRow.TotalQuotationAmount || qRow.FinalNegotiatedAmount || qNote.quoteAmountWon || qNote.totalEstimateAmount || 0);
        const actualMfgDays = Number(qRow.TargetMoldDays || qNote.availableMfgDays || qNote.targetMfgDays || 0);
        const actualShots = Number(qNote.guaranteedShots || qNote.moldShot || qNote.guaranteedShotCount || 0);
        const actualPoNo = qNote.moldPoNo || `MOLD-PO-${pjtId}`;

        // 이미 MpsiMoldDesign에 등록되어 있는지 확인
        const existing = await query(
          `SELECT "DesignID", "Note" FROM "MpsiMoldDesign" WHERE "DesignID" = $1 OR "ProjectID" = $1`,
          [pjtId]
        );

        if (existing.rows.length === 0) {
          // 수주확정 건 자동 신규 등재 (Step 1 상태)
          const initialNote = {
            moldNo: qNote.moldNo || `${pjtId}M`,
            moldDegree: qNote.moldDegree || 'M1',
            changeType: qNote.changeType || 'N001',
            projectName: qNote.projectName || '',
            productName: qNote.productName || '',
            customerName: qNote.customerName || '',
            moldVendor: qNote.selectedVendorName || qNote.vendorName || qRow.MoldVendorID || '우성정공(주)',
            targetT1Date: qNote.targetT1Date || '',
            targetMfgDays: actualMfgDays,
            currentStep: 1,
            drStatus: '검토 대기',
            moldDesignStatus: '검토 대기',
            product3DFile: qNote.specDocuments?.find((d: any) => d.category === '3D_MODEL')?.fileName || '',
            product3DNote: '금형 견적 의뢰 시 첨부된 3D 제품 데이터',
            // 실제 발주 정보
            moldPoNo: actualPoNo,
            moldPoAmount: actualPoAmount,
            moldPoDays: actualMfgDays,
            moldPoShot: actualShots,
            moldPoApproved: false,
            workLogs: [
              {
                id: `log-init-${Date.now()}`,
                authorId: 'MPSI_HQ',
                authorName: 'MPSI 시스템',
                authorRole: 'MPSI',
                content: `[수주확정 자동 연동] 금형 견적(${qRow.QuotationID}) 수주확정(제작처: ${qRow.MoldVendorID}, 견적가: ${actualPoAmount.toLocaleString()}원)으로 제품검토 및 금형설계 관리대장에 신규 등재되었습니다.`,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
              }
            ]
          };

          await query(
            `INSERT INTO "MpsiMoldDesign" (
              "DesignID", "ProjectID", "CadRevision",
              "Product3DModelFile", "DesignReviewStatus", "DesignApprovalStatus",
              "CreatorID", "CreationDateTime", "Note"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
            ON CONFLICT ("DesignID") DO NOTHING`,
            [
              pjtId,
              pjtId,
              'REV.01',
              initialNote.product3DFile,
              '검토 대기',
              '검토 대기',
              'MPSI_HQ',
              JSON.stringify(initialNote)
            ]
          );
        } else {
          // 기존에 등록되어 있으나 moldPoAmount 등이 비어있는 경우 실제 견적 데이터로 보정 업데이트
          const currentExistingRow = existing.rows[0];
          let existNote: any = {};
          if (currentExistingRow.Note) {
            try { existNote = typeof currentExistingRow.Note === 'string' ? JSON.parse(currentExistingRow.Note) : currentExistingRow.Note; } catch {}
          }

          if (existNote.moldPoAmount === undefined || existNote.moldPoAmount === 0 || !existNote.moldPoNo) {
            existNote.moldPoAmount = existNote.moldPoAmount || actualPoAmount;
            existNote.moldPoDays = existNote.moldPoDays || actualMfgDays;
            existNote.moldPoShot = existNote.moldPoShot || actualShots;
            existNote.moldPoNo = existNote.moldPoNo || actualPoNo;

            await query(
              `UPDATE "MpsiMoldDesign" SET "Note" = $1 WHERE "DesignID" = $2 OR "ProjectID" = $2`,
              [JSON.stringify(existNote), pjtId]
            );
          }
        }
      }
    } catch (syncErr) {
      console.warn('Auto-provisioning from confirmed quotations failed:', syncErr);
    }

    // 1-2. 전체 MpsiMoldDesign 데이터 조회
    const { searchParams } = new URL(request.url);
    const projectNo = searchParams.get('projectNo');

    let sql = `SELECT * FROM "MpsiMoldDesign"`;
    const params: any[] = [];
    if (projectNo) {
      params.push(projectNo);
      sql += ` WHERE "ProjectID" = $1 OR "DesignID" = $1`;
    }
    sql += ` ORDER BY "DesignSequenceNo" DESC`;

    const res = await query(sql, params);

    // ProjectMaster 및 MpsiMoldQuotation 정보 일괄 조회하여 실제 스펙 보강
    const pids = Array.from(new Set(res.rows.map((r: any) => r.ProjectID || r.DesignID).filter(Boolean)));
    const pmMap: Record<string, any> = {};
    const mqMap: Record<string, any> = {};

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
        console.warn("[Designs GET pmMap Warning]", pmErr);
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
        console.warn("[Designs GET mqMap Warning]", mqErr);
      }
    }

    const data = res.rows.map((row: any) => {
      const item = mapRowToDesignItem(row);
      const pid = item.projectNo;
      const pmInfo = pmMap[pid] || {};
      const mqInfo = mqMap[pid] || {};

      const actualMoldNo = pmInfo.moldNo || (item.moldNo && !item.moldNo.endsWith("P0M") ? item.moldNo : `${pid.replace(/P0$/, "")}M`);
      const actualDegree = pmInfo.moldDegree || mqInfo.moldDegree || item.moldDegree || "M1";
      const actualChange = pmInfo.changeType || mqInfo.changeType || item.changeType || "N001";
      const actualProjectName = pmInfo.projectName || mqInfo.projectName || item.projectName || "";
      const actualProductName = pmInfo.productName || pmInfo.projectNameCol || mqInfo.productName || item.productName || "";
      const actualCustomer = pmInfo.customerName || mqInfo.customerName || item.customerName || "";
      const actualVendor = mqInfo.vendorName || pmInfo.moldVendor || item.moldVendor || "우성정공(주)";
      const actualAmount = Number(item.moldPoAmount || 0) > 0 ? Number(item.moldPoAmount) : (mqInfo.finalAmount || 0);

      return {
        ...item,
        moldNo: actualMoldNo,
        moldDegree: actualDegree,
        changeType: actualChange,
        projectName: actualProjectName,
        productName: actualProductName,
        customerName: actualCustomer,
        moldVendor: actualVendor,
        moldPoAmount: actualAmount,
      };
    });

    return NextResponse.json({
      success: true,
      totalCount: data.length,
      data,
    });
  } catch (error: any) {
    console.error('GET /api/v1/mold-dev/designs error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. 신규 설계 항목 등록 (POST)
export async function POST(request: NextRequest) {
  try {
    await ensureNoteColumn();
    const body: DrawingDesignItem = await request.json();
    const designId = body.projectNo;
    if (!designId) {
      return NextResponse.json({ success: false, error: 'projectNo is required' }, { status: 400 });
    }

    const notePayload = {
      moldNo: body.moldNo || `${designId}M`,
      moldDegree: body.moldDegree || 'M1',
      changeType: body.changeType || 'N001',
      projectName: body.projectName || '',
      productName: body.productName || '',
      customerName: body.customerName || '',
      moldVendor: body.moldVendor || '우성정공(주)',
      targetT1Date: body.targetT1Date || '',
      targetMfgDays: body.targetMfgDays || 40,
      currentStep: body.currentStep || 1,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      product3DNote: body.product3DNote || '',
      moldMeetingReportFile: body.moldMeetingReportFile || '',
      moldMeetingReportNote: body.moldMeetingReportNote || '',
      caeReportFile: body.caeReportFile || '',
      caeReportNote: body.caeReportNote || '',
      moldPoNo: body.moldPoNo,
      moldPoAmount: body.moldPoAmount,
      moldPoDays: body.moldPoDays,
      moldPoShot: body.moldPoShot,
      moldPoFile: body.moldPoFile || '',
      moldPoFileNote: body.moldPoFileNote || '',
      moldPoAttached: body.moldPoAttached,
      moldPoApproved: body.moldPoApproved,
      moldPoApprovedDate: body.moldPoApprovedDate,
      mold3DDataNote: body.mold3DDataNote || '',
      materialOrderStatus: body.materialOrderStatus || '미승인',
      materialOrderApprover: body.materialOrderApprover,
      materialOrderApprovedDate: body.materialOrderApprovedDate,
      materialOrderNote: body.materialOrderNote,
      workLogs: body.workLogs || [],
    };

    const insertSql = `
      INSERT INTO "MpsiMoldDesign" (
        "DesignID", "ProjectID", "CadRevision",
        "Product3DModelFile", "Mold3DModelFile", "DfmReportFile", "CaeAnalysisFile",
        "DesignReviewStatus", "DesignApprovalStatus", "CreatorID", "CreationDateTime", "Note"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
      ON CONFLICT ("DesignID") DO UPDATE SET
        "ProjectID" = EXCLUDED."ProjectID",
        "Product3DModelFile" = EXCLUDED."Product3DModelFile",
        "Mold3DModelFile" = EXCLUDED."Mold3DModelFile",
        "DfmReportFile" = EXCLUDED."DfmReportFile",
        "CaeAnalysisFile" = EXCLUDED."CaeAnalysisFile",
        "DesignReviewStatus" = EXCLUDED."DesignReviewStatus",
        "DesignApprovalStatus" = EXCLUDED."DesignApprovalStatus",
        "Note" = EXCLUDED."Note"
      RETURNING *;
    `;

    const res = await query(insertSql, [
      designId,
      body.projectNo,
      body.moldDegree || 'REV.01',
      body.product3DFile || null,
      body.mold3DDataFile || null,
      body.moldMeetingReportFile || null,
      body.caeReportFile || null,
      body.drStatus || '검토 대기',
      body.moldDesignStatus || '검토 대기',
      'MPSI_USER',
      JSON.stringify(notePayload),
    ]);

    const anyBody = body as any;
    await syncDownstreamToProjectMaster(body.projectNo, {
      targetT1Date: body.targetT1Date || anyBody.expectedDelivery,
      moldDeliveryDate: anyBody.expectedDelivery,
      kickoffDate: anyBody.kickoffDate || anyBody.orderDate,
      cavity: anyBody.cavity,
      material: anyBody.material,
      moldVendor: body.moldVendor || anyBody.vendorName,
      partNo: anyBody.partNo,
      currentStep: body.currentStep,
    });

    return NextResponse.json({ success: true, data: mapRowToDesignItem(res.rows[0]) });
  } catch (error: any) {
    console.error('POST /api/v1/mold-dev/designs error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. 설계 검토 / 승인 / 파일 업로드 / 상태 변경 (PUT)
export async function PUT(request: NextRequest) {
  try {
    await ensureNoteColumn();
    const body = await request.json();
    const designId = body.projectNo || body.designId;
    if (!designId) {
      return NextResponse.json({ success: false, error: 'projectNo is required' }, { status: 400 });
    }

    const existing = await query(
      `SELECT * FROM "MpsiMoldDesign" WHERE "DesignID" = $1 OR "ProjectID" = $1`,
      [designId]
    );

    if (existing.rows.length === 0) {
      // 없으면 신규 INSERT
      return POST(request);
    }

    const row = existing.rows[0];
    let note: any = {};
    if (row.Note) {
      try { note = typeof row.Note === 'string' ? JSON.parse(row.Note) : row.Note; } catch {}
    }

    const updatedNote = {
      ...note,
      ...body,
      workLogs: body.workLogs !== undefined ? body.workLogs : note.workLogs || [],
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    const drStatus = body.drStatus !== undefined ? body.drStatus : row.DesignReviewStatus;
    const designApprovalStatus = body.moldDesignStatus !== undefined ? body.moldDesignStatus : row.DesignApprovalStatus;
    const prodFile = body.product3DFile !== undefined ? body.product3DFile : row.Product3DModelFile;
    const moldFile = body.mold3DDataFile !== undefined ? body.mold3DDataFile : row.Mold3DModelFile;
    const dfmFile = body.moldMeetingReportFile !== undefined ? body.moldMeetingReportFile : row.DfmReportFile;
    const caeFile = body.caeReportFile !== undefined ? body.caeReportFile : row.CaeAnalysisFile;

    const isApproved = drStatus === '검토완료' || drStatus === '최종검토완료' || designApprovalStatus === '검토완료';

    const updateSql = `
      UPDATE "MpsiMoldDesign" SET
        "Product3DModelFile" = $2::TEXT,
        "Mold3DModelFile" = $3::TEXT,
        "DfmReportFile" = $4::TEXT,
        "CaeAnalysisFile" = $5::TEXT,
        "DesignReviewStatus" = $6::TEXT,
        "DesignApprovalStatus" = $7::TEXT,
        "ApprovedDateTime" = CASE WHEN $8::BOOLEAN THEN NOW() ELSE "ApprovedDateTime" END,
        "Note" = $9::TEXT
      WHERE "DesignID" = $1::TEXT OR "ProjectID" = $1::TEXT
      RETURNING *;
    `;

    const res = await query(updateSql, [
      designId,
      prodFile || null,
      moldFile || null,
      dfmFile || null,
      caeFile || null,
      drStatus || '검토 대기',
      designApprovalStatus || '검토 대기',
      isApproved,
      JSON.stringify(updatedNote),
    ]);

    // ProjectMaster의 공정 단계 동기화 (설계 단계 진행 반영)
    try {
      let stageNum = 1;
      if (designApprovalStatus === '검토완료' || body.currentStep >= 6) {
        stageNum = 6;
      } else if (body.currentStep >= 5) {
        stageNum = 5;
      } else if (drStatus === '검토완료' || drStatus === '최종검토완료' || body.currentStep >= 4) {
        stageNum = 4;
      }

      await query(
        `UPDATE "ProjectMaster" 
         SET "CurrentProcessStage" = GREATEST("CurrentProcessStage", $2::INT), 
             "LastUpdateDateTime" = NOW() 
         WHERE "ProjectID" = $1`,
        [designId, stageNum]
      );
      await syncDownstreamToProjectMaster(designId, {
        targetT1Date: updatedNote.targetT1Date || undefined,
        moldDeliveryDate: updatedNote.moldDeliveryDate || undefined,
        targetMoldDays: updatedNote.moldPoDays || updatedNote.targetMfgDays || undefined,
        moldVendor: updatedNote.moldVendor || undefined,
        kickoffDate: updatedNote.moldPoApprovedDate ? String(updatedNote.moldPoApprovedDate).split(' ')[0] : undefined,
        currentStep: stageNum,
      });
    } catch (syncErr) {
      console.warn("ProjectMaster sync warning in designs PUT:", syncErr);
    }

    // 금형제작(MpsiMoldManufacture) 연동: 금형 설계 승인('검토완료') 또는 발주 승인 시 자동 등재
    try {
      const isDesignApproved = designApprovalStatus === '검토완료' || updatedNote.moldDesignStatus === '검토완료';
      const isPoApproved = updatedNote.moldPoApproved === true;
      const isMaterialApproved = updatedNote.materialOrderStatus === '승인완료';

      if (isDesignApproved || isPoApproved || isMaterialApproved) {
        const existMfg = await query(`SELECT "ProjectID", "Note" FROM "MpsiMoldManufacture" WHERE "ProjectID" = $1`, [designId]);
        const mfgStatus = '미입력';
        const stepNum = 6;

        if (existMfg.rows.length === 0) {
          // ProjectMaster 및 MpsiMoldQuotation에서 실제 원천 데이터 조회
          let pmData: any = {};
          try {
            const pmRes = await query(`SELECT "ProjectName", "Note" FROM "ProjectMaster" WHERE "ProjectID" = $1`, [designId]);
            if (pmRes.rows.length > 0) {
              pmData = JSON.parse(pmRes.rows[0].Note || "{}");
              pmData.projectNameCol = pmRes.rows[0].ProjectName;
            }
          } catch {}

          let mqData: any = {};
          try {
            const mqRes = await query(`SELECT "FinalNegotiatedAmount", "Note" FROM "MpsiMoldQuotation" WHERE "ProjectID" = $1`, [designId]);
            if (mqRes.rows.length > 0) {
              mqData = JSON.parse(mqRes.rows[0].Note || "{}");
              mqData.finalAmount = Number(mqRes.rows[0].FinalNegotiatedAmount || 0);
            }
          } catch {}

          let rawCavity = mqData.cavity || pmData.cavity || updatedNote.cavity;
          if (rawCavity && !rawCavity.includes("Cavity")) rawCavity = `${rawCavity} Cavity`;
          const actualCavity = rawCavity || "1*2 Cavity";

          const actualMaterial = mqData.moldMaterial || mqData.moldSteel || pmData.material || updatedNote.material || "SKD61";
          const actualMoldNo = pmData.moldNo || (updatedNote.moldNo && !updatedNote.moldNo.endsWith("P0M") ? updatedNote.moldNo : `${designId.replace(/P0$/, "")}M`);
          const actualDegree = pmData.moldDegree || mqData.moldDegree || updatedNote.moldDegree || "M1";
          const actualChange = pmData.changeType || mqData.changeType || updatedNote.changeType || "N001";
          const actualProjectName = pmData.projectName || mqData.projectName || updatedNote.projectName || "양산 신차 프로젝트";
          const actualProduct = pmData.productName || pmData.projectNameCol || mqData.productName || updatedNote.productName || "Main Mold Part";
          const actualCustomer = pmData.customerName || mqData.customerName || updatedNote.customerName || "원청사";
          const actualVendor = mqData.vendorName || pmData.moldVendor || updatedNote.moldVendor || "우성정공(주)";
          const actualAmount = Number(updatedNote.moldPoAmount || 0) > 0 ? Number(updatedNote.moldPoAmount) : (mqData.finalAmount || 0);
          const actualTargetT1 = updatedNote.targetT1Date || mqData.targetT1Date || pmData.targetT1Date || "2026-11-06";
          const actualDelivery = updatedNote.moldDeliveryDate || mqData.moldDeliveryDate || pmData.moldDeliveryDate || actualTargetT1 || "2026-12-15";

          const initNote = {
            id: 1,
            projectNo: designId,
            moldNo: actualMoldNo,
            moldDegree: actualDegree,
            changeType: actualChange,
            projectName: actualProjectName,
            productName: actualProduct,
            customerName: actualCustomer,
            moldVendor: actualVendor,
            cavity: actualCavity,
            material: actualMaterial,
            targetT1Date: actualTargetT1,
            moldDeliveryDate: actualDelivery,
            moldPoNo: updatedNote.moldPoNo || `MOLD-PO-${designId}`,
            orderDate: updatedNote.moldPoApprovedDate ? updatedNote.moldPoApprovedDate.split(" ")[0] : new Date().toISOString().split("T")[0],
            orderAmount: actualAmount,
            manufactureStatus: mfgStatus,
            scheduleFile: null,
            memoLogs: [
              {
                id: `memo-${Date.now()}`,
                authorId: "MPSI_HQ",
                authorName: "MPSI 구매개발실",
                company: "MPSI 본사",
                tag: isDesignApproved ? "설계승인완료" : "금형발주완료",
                content: isDesignApproved
                  ? `[금형설계 승인 연동] 금형 3D 설계 검토 승인이 완료되어 금형제작 일정 관제 대장에 정식 등재되었습니다. (가공 착수)`
                  : `[금형제작 착수 연동] 금형발주(PO: ${updatedNote.moldPoNo || `MOLD-PO-${designId}`})가 승인되어 금형제작 일정 관제 대장에 정식 등재되었습니다.`,
                createdAt: new Date().toLocaleString("ko-KR", { hour12: false }).replace(/\./g, "-").slice(0, 16)
              }
            ],
            processes: [
              { code: "GUN", name: "건드릴(냉각홀)", planDate: "11-08", actualDate: "", progress: 0, status: "대기" },
              { code: "ML", name: "황삭 밀링", planDate: "11-12", actualDate: "", progress: 0, status: "대기" },
              { code: "HT", name: "코어 열처리", planDate: "11-16", actualDate: "", progress: 0, status: "대기" },
              { code: "CNC", name: "CNC 정밀가공", planDate: "11-22", actualDate: "", progress: 0, status: "대기" },
              { code: "PL", name: "방전(EDM)", planDate: "11-27", actualDate: "", progress: 0, status: "대기" },
              { code: "WR", name: "와이어컷", planDate: "12-02", actualDate: "", progress: 0, status: "대기" },
              { code: "ASSY", name: "금형 조립/래핑", planDate: "12-08", actualDate: "", progress: 0, status: "대기" },
            ],
            overallProgress: 0,
            coreStatus: "대기",
            coreProgress: 0,
            assyStatus: "대기",
            assyProgress: 0,
            scheduleStatus: "정상",
            currentStep: stepNum,
            updatedAt: new Date().toLocaleString("ko-KR", { hour12: false }).replace(/\./g, "-").slice(0, 16),
            notes: isDesignApproved ? "금형 3D 설계 승인 완료, 공정 가공 착수 대기" : "MPSI 발주 승인 완료, 금형 제작 일정표 엑셀 업로드 대기"
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
            `MFG-${designId}`,
            designId,
            updatedNote.moldPoNo || `MOLD-PO-${designId}`,
            actualAmount,
            updatedNote.moldPoApprovedDate ? updatedNote.moldPoApprovedDate.split(" ")[0] : new Date().toISOString().split("T")[0],
            actualTargetT1,
            actualDelivery,
            0,
            mfgStatus,
            "MPSI_HQ",
            JSON.stringify(initNote)
          ]);
        } else if (isDesignApproved) {
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
              [JSON.stringify(existingNote), designId]
            );
          }
        }
      }
    } catch (syncMfgErr) {
      console.warn("MpsiMoldManufacture auto-sync warning in designs PUT:", syncMfgErr);
    }

    if (!res.rows || res.rows.length === 0) {
      return NextResponse.json({ success: true, data: updatedNote });
    }

    return NextResponse.json({ success: true, data: mapRowToDesignItem(res.rows[0]) });
  } catch (error: any) {
    console.error('PUT /api/v1/mold-dev/designs error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 4. 설계 항목 삭제 (DELETE)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectNo = searchParams.get('projectNo');
    if (!projectNo) {
      return NextResponse.json({ success: false, error: 'projectNo is required' }, { status: 400 });
    }

    await query(`DELETE FROM "MpsiMoldDesign" WHERE "ProjectID" = $1 OR "DesignID" = $1`, [projectNo]);
    return NextResponse.json({ success: true, message: `Design item for ${projectNo} deleted` });
  } catch (error: any) {
    console.error('DELETE /api/v1/mold-dev/designs error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

