// src/app/api/v1/mold-dev/quotations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { MoldDevEstimateItem, MoldQuotationStatus } from '@/lib/mold-quotation-store';
import { syncDownstreamToProjectMaster } from '@/lib/project-master-sync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let isNoteColumnChecked = false;
async function ensureNoteColumnIsText() {
  if (isNoteColumnChecked) return;
  try {
    await query(`ALTER TABLE "MpsiMoldQuotation" ALTER COLUMN "Note" TYPE TEXT;`);
    isNoteColumnChecked = true;
  } catch {
    isNoteColumnChecked = true;
  }
}

function mapRowToItem(row: any): MoldDevEstimateItem {
  let note: any = {};
  if (row.Note) {
    try {
      note = typeof row.Note === 'string' ? JSON.parse(row.Note) : row.Note;
    } catch {
      note = { rawNote: row.Note };
    }
  }

  const submissionDateStr = row.SubmissionDate
    ? (row.SubmissionDate instanceof Date
        ? row.SubmissionDate.toISOString().split('T')[0]
        : String(row.SubmissionDate).split('T')[0])
    : '';

  let projectNote: any = {};
  if (row.ProjectNote) {
    try {
      projectNote = typeof row.ProjectNote === 'string' ? JSON.parse(row.ProjectNote) : row.ProjectNote;
    } catch {}
  }

  return {
    id: Number(row.QuotationSequenceNo),
    estimateNo: row.QuotationID,
    projectNo: row.ProjectID,
    officialProjectNo: note.officialProjectNo || row.ProjectID,
    moldNo: projectNote.moldNo || note.moldNo || (row.ProjectID ? `${row.ProjectID.replace(/P0$/, "")}M` : ''),
    moldDegree: projectNote.moldDegree || note.moldDegree || 'M1',
    changeType: projectNote.changeType || note.changeType || 'N001',
    projectName: projectNote.projectName || note.projectName || '',
    productName: projectNote.productName || note.productName || '',
    customerName: projectNote.customerName || note.customerName || '',
    vendorName: note.vendorName || row.MoldVendorID || '',
    selectedVendorName: note.selectedVendorName || (row.QuotationStatus === '수주확정' ? row.MoldVendorID : undefined),
    assignedVendors: note.assignedVendors || (row.MoldVendorID ? [row.MoldVendorID] : []),
    productionType: note.productionType || 'OUTSOURCING',
    machineTypeTonnage: note.machineTypeTonnage || '',
    coreStructure: note.coreStructure || '',
    moldMaterial: projectNote.moldMaterial || note.moldMaterial || '',
    cavity: projectNote.cavity || note.cavity || '',
    gateType: note.gateType || '',
    moldSteel: note.moldSteel || '',
    resin: note.resin || projectNote.resinSpec || projectNote.rfqSpec?.resin || '',
    targetT1Date: projectNote.targetT1Date || note.targetT1Date || '',
    moldDeliveryDate: projectNote.moldDeliveryDate || note.moldDeliveryDate || '',
    targetMfgDays: row.TargetMoldDays !== null ? Number(row.TargetMoldDays) : (note.targetMfgDays || 40),
    targetCycleTime: note.targetCycleTime || 0,
    materialCostWon: row.MaterialCost !== null ? Number(row.MaterialCost) : 0,
    processingCostWon: row.MachiningCost !== null ? Number(row.MachiningCost) : 0,
    overheadProfitWon: row.DesignCost !== null ? Number(row.DesignCost) : 0,
    specialSpecWon: row.ManagementCost !== null ? Number(row.ManagementCost) : 0,
    quoteAmountWon: Number(row.TotalQuotationAmount || 0),
    availableMfgDays: note.availableMfgDays || (row.TargetMoldDays !== null ? Number(row.TargetMoldDays) : 40),
    targetBudgetWon: row.FinalNegotiatedAmount !== null ? Number(row.FinalNegotiatedAmount) : (note.targetBudgetWon || 0),
    quotationFileName: note.quotationFileName || '',
    quotationFileSize: note.quotationFileSize || '',
    quotationFileDate: note.quotationFileDate || '',
    quotationFileUrl: note.quotationFileUrl || '',
    downloadUrl: note.downloadUrl || '',
    vendorQuotes: note.vendorQuotes || [],
    specDocuments: note.specDocuments || [],
    submissionHistory: note.submissionHistory || [],
    status: (row.QuotationStatus as MoldQuotationStatus) || '견적요청',
    requestDate: note.requestDate || submissionDateStr,
    submittedDate: note.submittedDate || '',
    notes: note.notes || '',
    vendorNotes: note.vendorNotes || '',
    memos: note.memos || [],
  };
}

// 공통 저장(UPSERT) 로직
async function saveQuotationItem(item: any): Promise<MoldDevEstimateItem> {
  const notePayload = {
    officialProjectNo: item.officialProjectNo || item.projectNo || '',
    moldNo: item.moldNo || '',
    moldDegree: item.moldDegree || 'M1',
    changeType: item.changeType || 'N001',
    projectName: item.projectName || '',
    productName: item.productName || '',
    customerName: item.customerName || '',
    vendorName: item.vendorName || '',
    selectedVendorName: item.selectedVendorName,
    assignedVendors: item.assignedVendors || [],
    productionType: item.productionType || 'OUTSOURCING',
    machineTypeTonnage: item.machineTypeTonnage || '',
    coreStructure: item.coreStructure || '',
    moldMaterial: item.moldMaterial || '',
    cavity: item.cavity || '',
    gateType: item.gateType || '',
    moldSteel: item.moldSteel || '',
    resin: item.resin || '',
    targetT1Date: item.targetT1Date || '',
    moldDeliveryDate: item.moldDeliveryDate || '',
    targetMfgDays: item.targetMfgDays || 40,
    targetCycleTime: item.targetCycleTime || 0,
    targetBudgetWon: item.targetBudgetWon || 0,
    quotationFileName: item.quotationFileName || '',
    quotationFileSize: item.quotationFileSize || '',
    quotationFileDate: item.quotationFileDate || '',
    quotationFileUrl: item.quotationFileUrl || '',
    downloadUrl: item.downloadUrl || '',
    vendorQuotes: item.vendorQuotes || [],
    specDocuments: item.specDocuments || [],
    submissionHistory: item.submissionHistory || [],
    requestDate: item.requestDate || new Date().toISOString().split('T')[0],
    submittedDate: item.submittedDate || '',
    notes: item.notes || '',
    vendorNotes: item.vendorNotes || '',
    memos: item.memos || [],
  };

  const vendorId =
    item.selectedVendorName ||
    item.vendorName ||
    (item.assignedVendors && item.assignedVendors[0]) ||
    'WOOSUNG';

  const submissionDate =
    item.requestDate && String(item.requestDate).trim() !== ''
      ? item.requestDate
      : new Date().toISOString().split('T')[0];
  const confirmedDate =
    item.status === '수주확정'
      ? (item.submittedDate && String(item.submittedDate).trim() !== '' ? item.submittedDate : submissionDate)
      : null;

  const insertSql = `
    INSERT INTO "MpsiMoldQuotation" (
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
      "ConfirmedDate",
      "CreatorID",
      "CreationDateTime",
      "ModifierID",
      "ModificationDateTime",
      "Note"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), $16, NOW(), $17
    )
    ON CONFLICT ("QuotationID") DO UPDATE SET
      "ProjectID" = EXCLUDED."ProjectID",
      "EstimateNumber" = EXCLUDED."EstimateNumber",
      "MoldVendorID" = EXCLUDED."MoldVendorID",
      "MaterialCost" = EXCLUDED."MaterialCost",
      "MachiningCost" = EXCLUDED."MachiningCost",
      "DesignCost" = EXCLUDED."DesignCost",
      "ManagementCost" = EXCLUDED."ManagementCost",
      "TotalQuotationAmount" = EXCLUDED."TotalQuotationAmount",
      "FinalNegotiatedAmount" = EXCLUDED."FinalNegotiatedAmount",
      "TargetMoldDays" = EXCLUDED."TargetMoldDays",
      "QuotationStatus" = EXCLUDED."QuotationStatus",
      "ConfirmedDate" = EXCLUDED."ConfirmedDate",
      "ModifierID" = EXCLUDED."ModifierID",
      "ModificationDateTime" = NOW(),
      "Note" = EXCLUDED."Note"
    RETURNING *;
  `;

  const params = [
    item.estimateNo,                                    // $1 QuotationID
    item.projectNo || item.estimateNo,                  // $2 ProjectID
    item.officialProjectNo || item.estimateNo,          // $3 EstimateNumber
    vendorId,                                           // $4 MoldVendorID
    item.materialCostWon || 0,                          // $5 MaterialCost
    item.processingCostWon || 0,                        // $6 MachiningCost
    item.overheadProfitWon || 0,                        // $7 DesignCost
    item.specialSpecWon || 0,                           // $8 ManagementCost
    item.quoteAmountWon || 0,                           // $9 TotalQuotationAmount
    item.targetBudgetWon || null,                       // $10 FinalNegotiatedAmount
    item.targetMfgDays || 40,                           // $11 TargetMoldDays
    item.status || '견적요청',                          // $12 QuotationStatus
    submissionDate,                                     // $13 SubmissionDate
    confirmedDate,                                      // $14 ConfirmedDate
    'MPSI_HQ',                                          // $15 CreatorID
    'MPSI_HQ',                                          // $16 ModifierID
    JSON.stringify(notePayload),                        // $17 Note
  ];

  const res = await query(insertSql, params);
  const targetPjtNo = item.officialProjectNo || item.projectNo || '';
  if (targetPjtNo) {
    await syncDownstreamToProjectMaster(targetPjtNo, {
      targetT1Date: notePayload.targetT1Date || undefined,
      moldDeliveryDate: notePayload.moldDeliveryDate || undefined,
      targetMoldDays: notePayload.targetMfgDays || undefined,
      cavity: notePayload.cavity || undefined,
      moldMaterial: notePayload.moldMaterial || notePayload.moldSteel || undefined,
      resinSpec: notePayload.resin || undefined,
      machineTon: notePayload.machineTypeTonnage || undefined,
      moldNo: notePayload.moldNo || undefined,
      moldDegree: notePayload.moldDegree || undefined,
      moldVendor: (vendorId && vendorId !== 'WOOSUNG' && !vendorId.includes('전체')) ? vendorId : undefined,
    });
  }
  return mapRowToItem(res.rows[0]);
}

// 1. 금형 견적 목록 / 단건 조회 (PostgreSQL "MpsiMoldQuotation")
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estimateNo = searchParams.get('estimateNo');
    const projectNo = searchParams.get('projectNo');

    let sql = `
      SELECT 
        q."QuotationSequenceNo",
        q."QuotationID",
        q."ProjectID",
        q."EstimateNumber",
        q."MoldVendorID",
        q."MaterialCost",
        q."MachiningCost",
        q."DesignCost",
        q."ManagementCost",
        q."TotalQuotationAmount",
        q."FinalNegotiatedAmount",
        q."TargetMoldDays",
        q."QuotationStatus",
        q."SubmissionDate",
        q."ConfirmedDate",
        q."CreatorID",
        q."CreationDateTime",
        q."ModifierID",
        q."ModificationDateTime",
        q."Note",
        pm."Note" AS "ProjectNote"
      FROM "MpsiMoldQuotation" q
      LEFT JOIN "ProjectMaster" pm ON pm."ProjectID" = q."ProjectID"
      WHERE 1=1
    `;
    const params: any[] = [];

    if (estimateNo) {
      params.push(estimateNo);
      sql += ` AND q."QuotationID" = $${params.length}`;
    }

    if (projectNo) {
      params.push(projectNo);
      sql += ` AND q."ProjectID" = $${params.length}`;
    }

    sql += ` ORDER BY q."QuotationSequenceNo" DESC`;

    const res = await query(sql, params);
    const data = res.rows.map(mapRowToItem);

    return NextResponse.json({
      success: true,
      totalCount: data.length,
      data,
    });
  } catch (error: any) {
    console.error('GET /api/v1/mold-dev/quotations error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. 금형 견적 등록 / 일괄 동기화 (PostgreSQL "MpsiMoldQuotation" INSERT / ON CONFLICT UPDATE)
export async function POST(request: NextRequest) {
  try {
    await ensureNoteColumnIsText();
    const body = await request.json();
    const items: any[] = Array.isArray(body)
      ? body
      : body.items && Array.isArray(body.items)
      ? body.items
      : [body];

    const results: MoldDevEstimateItem[] = [];

    for (const item of items) {
      if (!item.estimateNo) {
        const basePjt = (item.officialProjectNo || item.projectNo || 'MI26001P0').trim();
        item.estimateNo = `${basePjt}금형견적`;
      }
      const saved = await saveQuotationItem(item);
      results.push(saved);
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results.length === 1 ? results[0] : results,
    });
  } catch (error: any) {
    console.error('POST /api/v1/mold-dev/quotations error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. 금형 견적 수정 (외주처 견적 제출, MPSI 승인/수주확정, 상태 변경, 메모 추가 등)
export async function PUT(request: NextRequest) {
  try {
    await ensureNoteColumnIsText();
    const body = await request.json();
    const estimateNo = body.estimateNo;
    if (!estimateNo) {
      return NextResponse.json({ success: false, error: 'estimateNo is required' }, { status: 400 });
    }

    const existing = await query(
      `SELECT * FROM "MpsiMoldQuotation" WHERE "QuotationID" = $1`,
      [estimateNo]
    );

    if (existing.rows.length === 0) {
      // 테이블에 없으면 새로 INSERT
      const created = await saveQuotationItem(body);
      return NextResponse.json({ success: true, data: created });
    }

    const row = existing.rows[0];
    let note: any = {};
    if (row.Note) {
      try {
        note = typeof row.Note === 'string' ? JSON.parse(row.Note) : row.Note;
      } catch {}
    }

    const updatedNote = {
      ...note,
      ...body,
      vendorQuotes: body.vendorQuotes !== undefined ? body.vendorQuotes : note.vendorQuotes,
      specDocuments: body.specDocuments !== undefined ? body.specDocuments : note.specDocuments,
      submissionHistory: body.submissionHistory !== undefined ? body.submissionHistory : note.submissionHistory,
      memos: body.memos !== undefined ? body.memos : note.memos,
    };

    const status = body.status || row.QuotationStatus;
    const materialCost = body.materialCostWon !== undefined ? body.materialCostWon : row.MaterialCost;
    const machiningCost = body.processingCostWon !== undefined ? body.processingCostWon : row.MachiningCost;
    const designCost = body.overheadProfitWon !== undefined ? body.overheadProfitWon : row.DesignCost;
    const managementCost = body.specialSpecWon !== undefined ? body.specialSpecWon : row.ManagementCost;
    const quoteAmount = body.quoteAmountWon !== undefined ? body.quoteAmountWon : row.TotalQuotationAmount;
    const finalAmount = body.targetBudgetWon !== undefined ? body.targetBudgetWon : row.FinalNegotiatedAmount;
    const targetDays = body.availableMfgDays || body.targetMfgDays || row.TargetMoldDays;
    const vendorId = body.selectedVendorName || body.vendorName || row.MoldVendorID;
    const confirmedDate =
      status === '수주확정'
        ? (row.ConfirmedDate && String(row.ConfirmedDate).trim() !== '' ? row.ConfirmedDate : new Date().toISOString().split('T')[0])
        : null;

    const updateSql = `
      UPDATE "MpsiMoldQuotation" SET
        "MoldVendorID" = COALESCE($2, "MoldVendorID"),
        "MaterialCost" = $3,
        "MachiningCost" = $4,
        "DesignCost" = $5,
        "ManagementCost" = $6,
        "TotalQuotationAmount" = $7,
        "FinalNegotiatedAmount" = $8,
        "TargetMoldDays" = $9,
        "QuotationStatus" = $10,
        "ConfirmedDate" = $11,
        "ModifierID" = $12,
        "ModificationDateTime" = NOW(),
        "Note" = $13
      WHERE "QuotationID" = $1
      RETURNING *;
    `;

    const res = await query(updateSql, [
      estimateNo,
      vendorId,
      materialCost,
      machiningCost,
      designCost,
      managementCost,
      quoteAmount,
      finalAmount,
      targetDays,
      status,
      confirmedDate,
      body.modifierId || 'MPSI_USER',
      JSON.stringify(updatedNote),
    ]);

    // 금형 견적 수정 시 ProjectMaster에 목표 T1, 금형 출고 납기, 캐비티 등 즉시 동기화
    const targetPjtId = row.ProjectID || updatedNote.officialProjectNo || updatedNote.projectNo;
    if (targetPjtId) {
      await syncDownstreamToProjectMaster(targetPjtId, {
        targetT1Date: updatedNote.targetT1Date || undefined,
        moldDeliveryDate: updatedNote.moldDeliveryDate || undefined,
        targetMoldDays: targetDays || updatedNote.targetMfgDays || undefined,
        cavity: updatedNote.cavity || undefined,
        moldMaterial: updatedNote.moldMaterial || updatedNote.moldSteel || undefined,
        resinSpec: updatedNote.resin || undefined,
        machineTon: updatedNote.machineTypeTonnage || undefined,
        moldVendor: (vendorId && vendorId !== 'WOOSUNG' && !vendorId.includes('전체')) ? vendorId : undefined,
        currentStep: status === '수주확정' ? 1 : undefined,
      });
    }

    // 수주 확정 시 ProjectMaster 및 MpsiMoldDesign 동기화
    if (status === '수주확정' && row.ProjectID) {
      try {
        await query(
          `UPDATE "ProjectMaster" 
           SET "ResponsibleDepartmentID" = $1, "CurrentProcessStage" = '1', "ModificationDateTime" = NOW() 
           WHERE "ProjectID" = $2`,
          [vendorId, row.ProjectID]
        );

        // MpsiMoldDesign(제품검토 및 금형설계 관리대장)으로 자동 등재
        const initialDesignNote = {
          moldNo: updatedNote.moldNo || `${row.ProjectID}M`,
          moldDegree: updatedNote.moldDegree || 'M1',
          changeType: updatedNote.changeType || 'N001',
          projectName: updatedNote.projectName || '',
          productName: updatedNote.productName || '',
          customerName: updatedNote.customerName || '',
          moldVendor: vendorId,
          targetT1Date: updatedNote.targetT1Date || '',
          targetMfgDays: Number(targetDays || updatedNote.targetMfgDays || updatedNote.availableMfgDays || 0),
          currentStep: 1,
          drStatus: '검토 대기',
          moldDesignStatus: '검토 대기',
          product3DFile: updatedNote.specDocuments?.find((d: any) => d.category === '3D_MODEL')?.fileName || '',
          product3DNote: '금형 견적 의뢰 시 배포된 3D 제품 모델링 데이터',
          // 실제 수주 견적 금액 및 일정 연동
          moldPoNo: updatedNote.moldPoNo || `MOLD-PO-${row.ProjectID}`,
          moldPoAmount: Number(quoteAmount || finalAmount || 0),
          moldPoDays: Number(targetDays || updatedNote.targetMfgDays || updatedNote.availableMfgDays || 0),
          moldPoShot: Number(updatedNote.guaranteedShots || updatedNote.moldShot || updatedNote.guaranteedShotCount || 0),
          moldPoApproved: false,
          workLogs: [
            {
              id: `log-confirm-${Date.now()}`,
              authorId: 'MPSI_HQ',
              authorName: 'MPSI 금형개발팀',
              authorRole: 'MPSI',
              content: `[수주확정 공식 등재] 견적 확정(낙찰: ${vendorId}, 견적가: ${Number(quoteAmount).toLocaleString()}원)에 따라 제품검토 및 금형설계 관리대장에 신규 등재되었습니다.`,
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
          ON CONFLICT ("DesignID") DO UPDATE SET
            "ProjectID" = EXCLUDED."ProjectID",
            "Note" = EXCLUDED."Note"`,
          [
            row.ProjectID,
            row.ProjectID,
            'REV.01',
            initialDesignNote.product3DFile,
            '검토 대기',
            '검토 대기',
            'MPSI_HQ',
            JSON.stringify(initialDesignNote)
          ]
        );
      } catch (pmErr) {
        console.warn('Failed to update ProjectMaster/MpsiMoldDesign on mold quotation confirm:', pmErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: mapRowToItem(res.rows[0]),
    });
  } catch (error: any) {
    console.error('PUT /api/v1/mold-dev/quotations error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 4. 금형 견적 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estimateNo = searchParams.get('estimateNo');
    if (!estimateNo) {
      return NextResponse.json({ success: false, error: 'estimateNo is required' }, { status: 400 });
    }

    await query(`DELETE FROM "MpsiMoldQuotation" WHERE "QuotationID" = $1`, [estimateNo]);

    return NextResponse.json({ success: true, message: `Quotation ${estimateNo} deleted` });
  } catch (error: any) {
    console.error('DELETE /api/v1/mold-dev/quotations error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
