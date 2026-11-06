// src/app/api/v1/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 초기 표준 시드 프로젝트 데이터 (제거됨 - 100% DB 실제 데이터만 취급)
const initialProjectsSeed: any[] = [];

// 유효한 날짜 문자열인지 검증하는 헬퍼 (미입력/빈값인 경우 절대 강제 오늘날짜를 넣지 않고 NULL 처리)
function isValidDate(d?: any): boolean {
  if (!d || typeof d !== 'string' || d.trim() === '') return false;
  const parsed = Date.parse(d.trim());
  return !isNaN(parsed);
}

// DB 행(Row) 데이터를 프론트엔드 전체 실무 ProjectItem 인터페이스로 완벽히 복원하는 매퍼
function mapRowToProject(row: any): any {
  let noteObj: any = {};
  try {
    noteObj = row.Note ? JSON.parse(row.Note) : {};
  } catch {
    noteObj = {};
  }

  const projectNo = row.ProjectID || noteObj.projectNo || '';
  const orderDate = row.ProjectContractDate
    ? new Date(row.ProjectContractDate).toISOString().split('T')[0]
    : noteObj.orderDate || '';
  const kickoffDate = row.ExpectedStartDate
    ? new Date(row.ExpectedStartDate).toISOString().split('T')[0]
    : noteObj.kickoffDate || '';
  const targetMassDate = row.ExpectedEndDate
    ? new Date(row.ExpectedEndDate).toISOString().split('T')[0]
    : noteObj.targetMassDate || '';

  return {
    id: Number(row.ProjectMasterSequenceNo),
    projectNo: projectNo,
    estimateNo: row.SalesDocumentNumber || noteObj.estimateNo || `EST-${projectNo}`,
    projectName: noteObj.projectName || row.ProjectName || '',
    productName: noteObj.productName || row.ProjectName || '',
    customerName: noteObj.customerName || noteObj.customer || row.PersonInChargeID || '현대자동차',
    partNo: row.ItemID || noteObj.partNo || '',
    moldNo: noteObj.moldNo || `${projectNo}M`,
    moldDegree: noteObj.moldDegree || 'M1',
    changeType: row.DivisionID || noteObj.changeType || 'N001',

    isContractConfirmed: noteObj.isContractConfirmed !== undefined ? noteObj.isContractConfirmed : true,
    isQuotePending: noteObj.isQuotePending !== undefined ? noteObj.isQuotePending : false,
    quotationStatus: noteObj.quotationStatus || undefined,
    stepNameCustom: noteObj.stepNameCustom || undefined,

    moldProductionType: noteObj.moldProductionType || row.ResponsibleDepartmentID || 'OUTSOURCING',
    moldVendor: noteObj.moldVendor || '우성정공(주)',
    massProductionType: noteObj.massProductionType || 'OUTSOURCING',
    massVendor: noteObj.massVendor || '(주)뉴몰드',

    cavity: noteObj.cavity || '',
    material: noteObj.material || '',
    partWeight: noteObj.partWeight || '',
    annualVolume: noteObj.annualVolume !== undefined ? noteObj.annualVolume : '',
    machineTon: noteObj.machineTon || '',
    hrsSpec: noteObj.hrsSpec || '',
    moldMaterial: noteObj.moldMaterial || '',
    resinSpec: noteObj.resinSpec || '',
    warrantyShots: noteObj.warrantyShots !== undefined ? noteObj.warrantyShots : '',

    registeredDate: noteObj.registeredDate || orderDate,
    quoteSubmitDate: noteObj.quoteSubmitDate || orderDate,
    orderDate: orderDate,
    kickoffDate: kickoffDate,
    targetMoldDays: noteObj.targetMoldDays || '',
    targetT1Date: noteObj.targetT1Date || noteObj.t1Date || '',
    actualT1Date: noteObj.actualT1Date || '',
    moldDeliveryDate: noteObj.moldDeliveryDate || '',
    targetMassDate: targetMassDate,
    massStartDate: noteObj.massStartDate || '',

    currentStep: (row.CurrentProcessStage !== null && row.CurrentProcessStage !== undefined && String(row.CurrentProcessStage).trim() !== '')
      ? Math.max(Number(row.CurrentProcessStage), Number(noteObj.currentStep || 0))
      : (noteObj.currentStep !== undefined ? Number(noteObj.currentStep) : 0),
    stepStatus: noteObj.stepStatus || row.ProjectStatusCode || '진행중',
    trialDegree: noteObj.trialDegree || 'T1 대기',
    trialCompletionRate: Number(noteObj.trialCompletionRate || 0),
    facilityEvent: noteObj.facilityEvent || '가동대기',

    orderQty: Number(noteObj.orderQty || 0),
    deliveredQty: Number(noteObj.deliveredQty || 0),
    notes: noteObj.notes || '',
    updatedAt: row.ModificationDateTime
      ? new Date(row.ModificationDateTime).toISOString().split('T')[0]
      : row.CreationDateTime
      ? new Date(row.CreationDateTime).toISOString().split('T')[0]
      : '',
    stepAttachments: noteObj.stepAttachments || {},
    stepMemos: noteObj.stepMemos || {},
  };
}

export async function GET(request: NextRequest) {
  try {
    const enterpriseId = process.env.NEXT_PUBLIC_NODE_ID || 'MPSI_HQ';

    // 0. Note 컬럼이 VARCHAR(1000)인 경우 TEXT로 자동 확장
    try {
      await query('ALTER TABLE "ProjectMaster" ALTER COLUMN "Note" TYPE TEXT');
    } catch {
      // 이미 TEXT이거나 권한 없을 시 무시
    }

    const res = await query(
      'SELECT * FROM "ProjectMaster" WHERE "EnterpriseID" = $1 AND ("UseIndicator" IS TRUE OR "UseIndicator" IS NULL) ORDER BY "ProjectMasterSequenceNo" ASC',
      [enterpriseId]
    );

    // 1. MpsiMoldDesign 및 MpsiMoldQuotation 실시간 동기화 데이터 조회
    let designsByProject: Record<string, any> = {};
    let quotesByProject: Record<string, any> = {};

    try {
      const designRes = await query(`SELECT * FROM "MpsiMoldDesign"`);
      for (const d of designRes.rows) {
        let dNote: any = {};
        try { dNote = typeof d.Note === 'string' ? JSON.parse(d.Note) : (d.Note || {}); } catch {}
        const pId = d.ProjectID || d.DesignID;
        if (pId) {
          designsByProject[pId] = {
            ...d,
            note: dNote,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load MpsiMoldDesign for project sync:', e);
    }

    try {
      const quoteRes = await query(`SELECT * FROM "MpsiMoldQuotation"`);
      for (const q of quoteRes.rows) {
        let qNote: any = {};
        try { qNote = typeof q.Note === 'string' ? JSON.parse(q.Note) : (q.Note || {}); } catch {}
        const pId = q.ProjectID || q.QuotationID;
        if (pId) {
          quotesByProject[pId] = {
            ...q,
            note: qNote,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load MpsiMoldQuotation for project sync:', e);
    }

    let existingRows = [...res.rows];
    const existingProjectIds = new Set(existingRows.map((r) => r.ProjectID));

    // 2. MpsiMoldDesign 또는 MpsiMoldQuotation에는 있으나 ProjectMaster에 누락된 프로젝트 자동 Backfill
    for (const [pId, d] of Object.entries(designsByProject)) {
      if (!existingProjectIds.has(pId)) {
        try {
          const insertRes = await query(
            `INSERT INTO "ProjectMaster" (
              "EnterpriseID", "ProjectID", "ProjectName", "ProjectStatusCode",
              "ResponsibleDepartmentID", "CurrentProcessStage", "CreationDateTime", "ModificationDateTime", "Note"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, NOW(), NOW(), $7
            ) RETURNING *;`,
            [
              enterpriseId,
              pId,
              d.note.productName || d.note.projectName || pId,
              '진행중',
              d.note.moldVendor || '우성정공(주)',
              d.note.currentStep || 1,
              JSON.stringify({
                ...d.note,
                isContractConfirmed: true,
                quotationStatus: '수주확정',
              })
            ]
          );
          if (insertRes.rows.length > 0) {
            existingRows.push(insertRes.rows[0]);
            existingProjectIds.add(pId);
          }
        } catch (insertErr) {
          console.warn('Backfill ProjectMaster from MpsiMoldDesign warning:', insertErr);
        }
      }
    }

    // MpsiProjectStepAttachment 및 MpsiProjectStepMemo, MpsiProjectStage 실시간 조회 및 매핑
    let attachmentsByProject: Record<string, Record<number, any[]>> = {};
    let memosByProject: Record<string, Record<number, string>> = {};

    try {
      const attRes = await query(`SELECT * FROM "MpsiProjectStepAttachment" ORDER BY "AttachmentSequenceNo" ASC`);
      for (const r of attRes.rows) {
        if (!attachmentsByProject[r.ProjectID]) attachmentsByProject[r.ProjectID] = {};
        const step = r.StepNumber || 0;
        if (!attachmentsByProject[r.ProjectID][step]) attachmentsByProject[r.ProjectID][step] = [];
        const ext = r.FileName ? r.FileName.split('.').pop()?.toLowerCase() || 'file' : 'file';
        attachmentsByProject[r.ProjectID][step].push({
          id: r.AttachmentID,
          name: r.FileName,
          size: r.FileSize || '1.0 MB',
          date: r.UploadDateTime ? new Date(r.UploadDateTime).toISOString().split('T')[0] : '',
          ext,
          url: r.FileUrl,
          uploader: r.UploaderName,
        });
      }
    } catch (e) {
      console.warn('Failed to load MpsiProjectStepAttachment:', e);
    }

    try {
      const memoRes = await query(`SELECT * FROM "MpsiProjectStepMemo" ORDER BY "MemoSequenceNo" ASC`);
      for (const r of memoRes.rows) {
        if (!memosByProject[r.ProjectID]) memosByProject[r.ProjectID] = {};
        const step = r.StepNumber || 0;
        memosByProject[r.ProjectID][step] = r.Content || '';
      }
    } catch (e) {
      console.warn('Failed to load MpsiProjectStepMemo:', e);
    }

    const projects = existingRows.map((row) => {
      const p = mapRowToProject(row);
      const pId = p.projectNo;
      const dbAtts = attachmentsByProject[pId] || {};
      const dbMemos = memosByProject[pId] || {};

      const mergedAttachments: Record<number, any[]> = { ...(p.stepAttachments || {}) };
      for (const [stepStr, atts] of Object.entries(dbAtts)) {
        const stepNum = Number(stepStr);
        mergedAttachments[stepNum] = atts;
      }

      const mergedMemos: Record<number, string> = { ...(p.stepMemos || {}), ...dbMemos };

      // 3. 실시간 MpsiMoldDesign 및 MpsiMoldQuotation DB 데이터와 완전 동기화
      const matchedDesign = designsByProject[pId];
      const matchedQuote = quotesByProject[pId] || quotesByProject[p.estimateNo];

      let finalStep = p.currentStep;
      let isConfirmed = p.isContractConfirmed;
      let qStatus = p.quotationStatus;
      let moldVendor = p.moldVendor;
      let targetT1 = p.targetT1Date;
      let targetDays = p.targetMoldDays;
      let stepStatus = p.stepStatus;

      if (matchedDesign) {
        const dNote = matchedDesign.note;
        isConfirmed = true;
        qStatus = '수주확정';
        if (dNote.moldVendor) moldVendor = dNote.moldVendor;
        if (dNote.targetT1Date) targetT1 = dNote.targetT1Date;
        if (dNote.targetMfgDays) targetDays = dNote.targetMfgDays;
        
        let dStep = Number(dNote.currentStep || 1);
        if (matchedDesign.DesignApprovalStatus === '검토완료' || dNote.moldDesignStatus === '검토완료') {
          dStep = Math.max(dStep, 6);
        } else if (dNote.moldPoApproved || dNote.moldDesignStatus === '검토요청') {
          dStep = Math.max(dStep, 5);
        } else if (matchedDesign.DesignReviewStatus === '검토완료' || dNote.drStatus === '검토완료' || dNote.drStatus === '최종검토완료') {
          dStep = Math.max(dStep, 4);
        } else if (matchedDesign.DesignReviewStatus === '수정요청' || dNote.drStatus === '수정요청') {
          dStep = Math.max(dStep, 3);
          stepStatus = 'Fail(수정중)';
        } else if (matchedDesign.DesignReviewStatus === '검토요청' || dNote.drStatus === '검토요청') {
          dStep = Math.max(dStep, 2);
        }
        finalStep = Math.max(finalStep, dStep);
      }

      if (matchedQuote) {
        const q = matchedQuote;
        if (q.QuotationStatus === '수주확정') {
          isConfirmed = true;
          qStatus = '수주확정';
          finalStep = Math.max(finalStep, 1);
        } else if (q.QuotationStatus) {
          qStatus = q.QuotationStatus;
        }
        if (q.MoldVendorID) moldVendor = q.MoldVendorID;
        if (q.TargetMoldDays && !targetDays) targetDays = q.TargetMoldDays;
      }

      return {
        ...p,
        currentStep: finalStep,
        isContractConfirmed: isConfirmed,
        isQuotePending: !isConfirmed,
        quotationStatus: qStatus,
        moldVendor,
        targetT1Date: targetT1,
        targetMoldDays: targetDays,
        stepStatus,
        stepAttachments: mergedAttachments,
        stepMemos: mergedMemos,
      };
    });

    return NextResponse.json({
      success: true,
      totalCount: projects.length,
      data: projects,
    });
  } catch (error: any) {
    console.error('GET /api/v1/projects error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const enterpriseId = process.env.NEXT_PUBLIC_NODE_ID || 'MPSI_HQ';

    // 0. Note 컬럼이 VARCHAR(1000)인 경우 TEXT로 자동 확장
    try {
      await query('ALTER TABLE "ProjectMaster" ALTER COLUMN "Note" TYPE TEXT');
    } catch {
      // ignore
    }

    const projectNo = body.projectNo?.trim() || `MI26000P0`;
    const productName = body.productName?.trim() || body.projectName?.trim() || projectNo;
    const projectName = body.projectName?.trim() || productName;
    const customerName = body.customerName || body.customer || '고객사';
    const estimateNo = body.estimateNo || `Q26000-01`;
    const partNo = body.partNo || '';
    const moldNo = body.moldNo || `${projectNo}M`;
    const moldDegree = body.moldDegree || 'M1';
    const changeType = body.changeType || 'N001';

    const orderDate = isValidDate(body.orderDate) ? new Date(body.orderDate) : null;
    const kickoffDate = isValidDate(body.kickoffDate) ? new Date(body.kickoffDate) : null;
    const targetMassDate = isValidDate(body.targetMassDate) 
      ? new Date(body.targetMassDate) 
      : (isValidDate(body.targetT1Date) ? new Date(body.targetT1Date) : null);
    const actualStartDate = isValidDate(body.actualStartDate) ? new Date(body.actualStartDate) : null;
    const actualEndDate = isValidDate(body.massStartDate) ? new Date(body.massStartDate) : null;

    // 1. 모달에서 입력된 전체 실무 파라미터를 Note JSON에 100% 보존
    const fullDetails = {
      ...body,
      projectNo,
      productName,
      projectName,
      customerName,
      estimateNo,
      partNo,
      moldNo,
      moldDegree,
      changeType,
      moldProductionType: body.moldProductionType || 'OUTSOURCING',
      moldVendor: body.moldVendor || '우성정공(주)',
      massProductionType: body.massProductionType || 'OUTSOURCING',
      massVendor: body.massVendor || '(주)뉴몰드',
      cavity: body.cavity || '1*2 Cavity',
      material: body.material || 'NAK80 / PP',
      partWeight: body.partWeight || '420g',
      annualVolume: body.annualVolume || 50000,
      machineTon: body.machineTon || '650T',
      hrsSpec: body.hrsSpec || '밸브게이트 2-Drop',
      moldMaterial: body.moldMaterial || 'NAK80',
      resinSpec: body.resinSpec || 'PP-EPDM',
      warrantyShots: body.warrantyShots || 500000,
      registeredDate: body.registeredDate || new Date().toISOString().split('T')[0],
      quoteSubmitDate: body.quoteSubmitDate || body.registeredDate,
      orderDate: body.orderDate || '',
      kickoffDate: body.kickoffDate || '',
      targetMoldDays: body.targetMoldDays || 45,
      targetT1Date: body.targetT1Date || '',
      actualT1Date: body.actualT1Date || '',
      moldDeliveryDate: body.moldDeliveryDate || '',
      targetMassDate: body.targetMassDate || '',
      massStartDate: body.massStartDate || '',
      currentStep: body.currentStep !== undefined ? Number(body.currentStep) : 0,
      stepStatus: body.stepStatus || '진행중',
      stepNameCustom: body.stepNameCustom,
      trialDegree: body.trialDegree || 'T1 대기',
      trialCompletionRate: body.trialCompletionRate || 0,
      facilityEvent: body.facilityEvent || '가동대기',
      orderQty: body.orderQty || 0,
      deliveredQty: body.deliveredQty || 0,
      isContractConfirmed: body.isContractConfirmed !== undefined ? body.isContractConfirmed : true,
      isQuotePending: body.isQuotePending !== undefined ? body.isQuotePending : false,
      quotationStatus: body.quotationStatus,
      notes: body.notes || '',
      stepAttachments: body.stepAttachments || {},
      stepMemos: body.stepMemos || {},
    };

    const insertSql = `
      INSERT INTO "ProjectMaster" (
        "EnterpriseID", 
        "SiteID", 
        "PlantID", 
        "ProjectID", 
        "ProjectName",
        "ProjectStatusCode", 
        "ResponsibleDepartmentID", 
        "PersonInChargeID",
        "ProjectContractDate", 
        "ExpectedStartDate", 
        "ExpectedEndDate",
        "ActualStartDate", 
        "ActualEndDate", 
        "SalesDocumentNumber", 
        "SalesDocumentSequence",
        "ItemID", 
        "UseIndicator", 
        "DivisionID", 
        "Note", 
        "CreationDateTime", 
        "ModificationDateTime"
      ) VALUES (
        $1, $2, $3, $4, $5, 
        $6, $7, $8, 
        $9, $10, $11, 
        $12, $13, $14, $15, 
        $16, $17, $18, $19, NOW(), NOW()
      )
      ON CONFLICT ("EnterpriseID", "ProjectID") DO UPDATE SET
        "ProjectName" = EXCLUDED."ProjectName",
        "ProjectStatusCode" = EXCLUDED."ProjectStatusCode",
        "ResponsibleDepartmentID" = EXCLUDED."ResponsibleDepartmentID",
        "PersonInChargeID" = EXCLUDED."PersonInChargeID",
        "ProjectContractDate" = EXCLUDED."ProjectContractDate",
        "ExpectedStartDate" = EXCLUDED."ExpectedStartDate",
        "ExpectedEndDate" = EXCLUDED."ExpectedEndDate",
        "SalesDocumentNumber" = EXCLUDED."SalesDocumentNumber",
        "ItemID" = EXCLUDED."ItemID",
        "DivisionID" = EXCLUDED."DivisionID",
        "UseIndicator" = TRUE,
        "Note" = EXCLUDED."Note",
        "ModificationDateTime" = NOW()
      RETURNING *
    `;

    const params = [
      enterpriseId,                                // $1 EnterpriseID
      body.siteId || 'SITE_01',                    // $2 SiteID
      body.plantId || 'PLANT_01',                  // $3 PlantID
      projectNo,                                   // $4 ProjectID
      productName,                                 // $5 ProjectName
      body.stepStatus || '진행중',                  // $6 ProjectStatusCode
      body.moldProductionType || 'OUTSOURCING',    // $7 ResponsibleDepartmentID (외주/자체)
      customerName,                                // $8 PersonInChargeID (고객사명)
      orderDate,                                   // $9 ProjectContractDate (수주일)
      kickoffDate,                                 // $10 ExpectedStartDate (착수일)
      targetMassDate,                              // $11 ExpectedEndDate (목표양산일)
      actualStartDate,                             // $12 ActualStartDate
      actualEndDate,                               // $13 ActualEndDate
      estimateNo,                                  // $14 SalesDocumentNumber (견적번호)
      1,                                           // $15 SalesDocumentSequence
      partNo,                                      // $16 ItemID (품번)
      true,                                        // $17 UseIndicator
      changeType,                                  // $18 DivisionID (차수구분 N001/E001)
      JSON.stringify(fullDetails),                 // $19 Note (전체 실무 상세 속성 일체)
    ];

    const res = await query(insertSql, params);

    // MpsiProjectStage 테이블이 존재할 경우 공정 상태 동기화
    try {
      await query(
        `INSERT INTO "MpsiProjectStage" (
          "ProjectID", "StepNumber", "StepName", "StepStatus", "CreationDateTime"
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT ("ProjectID", "StepNumber") DO UPDATE SET
          "StepName" = EXCLUDED."StepName",
          "StepStatus" = EXCLUDED."StepStatus"`,
        [projectNo, fullDetails.currentStep, fullDetails.stepNameCustom || '진행', fullDetails.stepStatus]
      );
    } catch {
      // optional
    }

    return NextResponse.json({
      success: true,
      message: `프로젝트 [${projectNo}]가 데이터베이스에 완벽히 등록되었습니다.`,
      data: mapRowToProject(res.rows[0]),
    });
  } catch (error: any) {
    console.error('POST /api/v1/projects error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const enterpriseId = process.env.NEXT_PUBLIC_NODE_ID || 'MPSI_HQ';

    const cur = await query(
      'SELECT * FROM "ProjectMaster" WHERE "EnterpriseID" = $1 AND "ProjectID" = $2',
      [enterpriseId, body.projectNo]
    );

    if (cur.rows.length === 0) {
      return NextResponse.json({ success: false, error: '해당 프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    }

    const row = cur.rows[0];
    let existingNote: any = {};
    try {
      existingNote = row.Note ? JSON.parse(row.Note) : {};
    } catch {
      existingNote = {};
    }

    const mergedNote = {
      ...existingNote,
      ...body,
      stepMemos: body.stepMemos || existingNote.stepMemos || {},
      stepAttachments: body.stepAttachments || existingNote.stepAttachments || {},
    };

    const updateSql = `
      UPDATE "ProjectMaster" SET
        "ProjectName" = COALESCE($1, "ProjectName"),
        "ProjectStatusCode" = COALESCE($2, "ProjectStatusCode"),
        "ResponsibleDepartmentID" = COALESCE($3, "ResponsibleDepartmentID"),
        "PersonInChargeID" = COALESCE($4, "PersonInChargeID"),
        "ProjectContractDate" = COALESCE($5, "ProjectContractDate"),
        "ExpectedStartDate" = COALESCE($6, "ExpectedStartDate"),
        "ExpectedEndDate" = COALESCE($7, "ExpectedEndDate"),
        "SalesDocumentNumber" = COALESCE($8, "SalesDocumentNumber"),
        "ItemID" = COALESCE($9, "ItemID"),
        "DivisionID" = COALESCE($10, "DivisionID"),
        "Note" = $11,
        "ModificationDateTime" = NOW()
      WHERE "EnterpriseID" = $12 AND "ProjectID" = $13
      RETURNING *
    `;

    const params = [
      body.productName || body.projectName || null,
      body.stepStatus || body.status || null,
      body.moldProductionType || null,
      body.customerName || body.customer || null,
      isValidDate(body.orderDate) ? new Date(body.orderDate) : null,
      isValidDate(body.kickoffDate) ? new Date(body.kickoffDate) : null,
      isValidDate(body.targetMassDate) 
        ? new Date(body.targetMassDate) 
        : (isValidDate(body.targetT1Date) ? new Date(body.targetT1Date) : null),
      body.estimateNo || null,
      body.partNo || null,
      body.changeType || null,
      JSON.stringify(mergedNote),
      enterpriseId,
      body.projectNo,
    ];

    const res = await query(updateSql, params);
    return NextResponse.json({
      success: true,
      message: '프로젝트가 성공적으로 갱신되었습니다.',
      data: mapRowToProject(res.rows[0]),
    });
  } catch (error: any) {
    console.error('PUT /api/v1/projects error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectNo = searchParams.get('projectNo');
    const enterpriseId = process.env.NEXT_PUBLIC_NODE_ID || 'MPSI_HQ';

    if (!projectNo) {
      return NextResponse.json({ success: false, error: '삭제할 projectNo가 지정되지 않았습니다.' }, { status: 400 });
    }

    // 물리 삭제 대신 국가표준 UseIndicator 플래그를 FALSE(삭제/비활성)로 업데이트
    await query(
      `UPDATE "ProjectMaster" 
       SET "UseIndicator" = FALSE, 
           "ModificationDateTime" = NOW() 
       WHERE "EnterpriseID" = $1 AND "ProjectID" = $2`,
      [enterpriseId, projectNo]
    );

    return NextResponse.json({
      success: true,
      message: `프로젝트 [${projectNo}]의 상태 플래그(UseIndicator)가 삭제(FALSE) 처리되었습니다.`,
    });
  } catch (error: any) {
    console.error('DELETE /api/v1/projects error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
