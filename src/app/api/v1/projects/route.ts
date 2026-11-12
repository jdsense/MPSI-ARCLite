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

// 날짜 객체 또는 문자열을 KST 로컬 기준 YYYY-MM-DD 로 안전하게 변환 (Timezone 밀림 방지)
function formatDateOnly(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val.split('T')[0];
  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(val).split('T')[0];
}

// DB 행(Row) 데이터를 프론트엔드 전체 실무 ProjectItem 인터페이스로 완벽히 복원하는 매퍼
function mapRowToProject(row: any): any {
  let noteObj: any = {};
  try {
    noteObj = row.Note ? JSON.parse(row.Note) : {};
  } catch {
    noteObj = {};
  }

  const rawProjectId = row.ProjectID || noteObj.projectNo || '';
  const projectNo = noteObj.projectNo || String(rawProjectId).split('__')[0] || '';
  const orderDate = row.ProjectContractDate
    ? formatDateOnly(row.ProjectContractDate)
    : noteObj.orderDate || '';
  const kickoffDate = row.ExpectedStartDate
    ? formatDateOnly(row.ExpectedStartDate)
    : noteObj.kickoffDate || '';
  const targetMassDate = row.ExpectedEndDate
    ? formatDateOnly(row.ExpectedEndDate)
    : noteObj.targetMassDate || '';

  const isPromotedFromQuote = Boolean(noteObj.isPromotedFromQuote);
  const isRegistrationCompleted = Boolean(noteObj.isRegistrationCompleted);

  return {
    id: Number(row.ProjectMasterSequenceNo),
    projectNo: projectNo,
    estimateNo: row.SalesDocumentNumber || noteObj.estimateNo || `EST-${projectNo}`,
    projectName: noteObj.projectName || row.ProjectName || '',
    productName: noteObj.productName || row.ProjectName || '',
    customerName: noteObj.customerName || noteObj.customer || row.PersonInChargeID || '고객사',
    partNo: row.ItemID || noteObj.partNo || '',
    moldNo: noteObj.moldNo !== undefined ? noteObj.moldNo : '',
    moldDegree: noteObj.moldDegree !== undefined ? noteObj.moldDegree : '',
    changeType: row.DivisionID || noteObj.changeType || 'N001',

    isPromotedFromQuote,
    isRegistrationCompleted,
    isContractConfirmed: ((row.DivisionID && String(row.DivisionID).startsWith('E')) || (noteObj.changeType && String(noteObj.changeType).startsWith('E')))
      ? true 
      : (noteObj.isContractConfirmed !== undefined ? noteObj.isContractConfirmed : true),
    isQuotePending: ((row.DivisionID && String(row.DivisionID).startsWith('E')) || (noteObj.changeType && String(noteObj.changeType).startsWith('E')))
      ? false 
      : (noteObj.isQuotePending !== undefined ? noteObj.isQuotePending : false),
    quotationStatus: ((row.DivisionID && String(row.DivisionID).startsWith('E')) || (noteObj.changeType && String(noteObj.changeType).startsWith('E')))
      ? (noteObj.quotationStatus || '수주확정')
      : (noteObj.quotationStatus || undefined),
    stepNameCustom: ((row.DivisionID && String(row.DivisionID).startsWith('E')) || (noteObj.changeType && String(noteObj.changeType).startsWith('E')))
      ? (noteObj.stepNameCustom || '수주확정')
      : (noteObj.stepNameCustom || ''),

    moldProductionType: noteObj.moldProductionType || row.ResponsibleDepartmentID || 'OUTSOURCING',
    moldVendor: noteObj.moldVendor !== undefined ? noteObj.moldVendor : '',
    massProductionType: noteObj.massProductionType || 'OUTSOURCING',
    massVendor: noteObj.massVendor !== undefined ? noteObj.massVendor : '',

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
      ? formatDateOnly(row.ModificationDateTime)
      : row.CreationDateTime
      ? formatDateOnly(row.CreationDateTime)
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

    // 1. 전 공정 테이블(원청사견적, 금형견적, 금형설계, 금형제작, 시사출, 양산견적, 시양산, PPAP) 실시간 동기화 데이터 조회
    let primeQuotesByProject: Record<string, any> = {};
    let designsByProject: Record<string, any> = {};
    let quotesByProject: Record<string, any> = {};
    let mfgByProject: Record<string, any> = {};
    let trialsByProject: Record<string, any> = {};
    let massQuotesByProject: Record<string, any> = {};
    let validationsByProject: Record<string, any> = {};
    let ppapsByProject: Record<string, any> = {};

    try {
      const pqRes = await query(`SELECT * FROM "MpsiPrimeQuotation"`);
      for (const pq of pqRes.rows) {
        let pqNote: any = {};
        try { pqNote = typeof pq.Note === 'string' ? JSON.parse(pq.Note) : (pq.Note || {}); } catch {}
        const keys = [pq.QuotationID, pq.OfficialProjectNo, pqNote.officialProjectNo, pqNote.projectNo].filter(Boolean);
        for (const k of keys) {
          primeQuotesByProject[k] = { ...pq, note: pqNote };
        }
      }
    } catch {}

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
        const pId = q.ProjectID || qNote.officialProjectNo || qNote.projectNo || q.QuotationID;
        if (pId) {
          quotesByProject[pId] = {
            ...q,
            note: qNote,
          };
        }
        if (q.QuotationID) {
          quotesByProject[q.QuotationID] = {
            ...q,
            note: qNote,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load MpsiMoldQuotation for project sync:', e);
    }

    try {
      const mfgRes = await query(`SELECT * FROM "MpsiMoldManufacture"`);
      for (const m of mfgRes.rows) {
        let mNote: any = {};
        try { mNote = typeof m.Note === 'string' ? JSON.parse(m.Note) : (m.Note || {}); } catch {}
        if (m.ProjectID) mfgByProject[m.ProjectID] = { ...m, note: mNote };
      }
    } catch {}

    try {
      const trialRes = await query(`SELECT * FROM "MpsiMoldTrial"`);
      for (const t of trialRes.rows) {
        let tNote: any = {};
        try { tNote = typeof t.Note === 'string' ? JSON.parse(t.Note) : (t.Note || {}); } catch {}
        if (t.ProjectID) trialsByProject[t.ProjectID] = { ...t, note: tNote };
      }
    } catch {}

    try {
      const mqRes = await query(`SELECT * FROM "MpsiMassQuotation"`);
      for (const mq of mqRes.rows) {
        let mqNote: any = {};
        try { mqNote = typeof mq.Note === 'string' ? JSON.parse(mq.Note) : (mq.Note || {}); } catch {}
        const pId = mq.ProjectID || mqNote.officialProjectNo || mqNote.projectNo;
        if (pId) massQuotesByProject[pId] = { ...mq, note: mqNote };
      }
    } catch {}

    try {
      const valRes = await query(`SELECT * FROM "MpsiMassValidation"`);
      for (const v of valRes.rows) {
        let vNote: any = {};
        try { vNote = typeof v.Note === 'string' ? JSON.parse(v.Note) : (v.Note || {}); } catch {}
        if (v.ProjectID) validationsByProject[v.ProjectID] = { ...v, note: vNote };
      }
    } catch {}

    try {
      const ppapRes = await query(`SELECT * FROM "MpsiMassPpap"`);
      for (const pp of ppapRes.rows) {
        let ppNote: any = {};
        try { ppNote = typeof pp.Note === 'string' ? JSON.parse(pp.Note) : (pp.Note || {}); } catch {}
        if (pp.ProjectID) ppapsByProject[pp.ProjectID] = { ...pp, note: ppNote };
      }
    } catch {}

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
      const rawDbId = row.ProjectID || p.projectNo;
      const isRevision = Boolean(p.changeType && p.changeType !== 'N001');
      const pId = isRevision ? rawDbId : p.projectNo;
      const dbAtts = attachmentsByProject[pId] || (!isRevision ? attachmentsByProject[p.projectNo] : {}) || {};
      const dbMemos = memosByProject[pId] || (!isRevision ? memosByProject[p.projectNo] : {}) || {};

      const mergedAttachments: Record<number, any[]> = { ...(p.stepAttachments || {}) };
      for (const [stepStr, atts] of Object.entries(dbAtts)) {
        const stepNum = Number(stepStr);
        mergedAttachments[stepNum] = atts;
      }

      const mergedMemos: Record<number, string> = { ...(p.stepMemos || {}), ...dbMemos };

      // 3. 실시간 공정 테이블(원청사견적, 금형견적, 설계, 제작, 시사출, 양산견적, 시양산, PPAP) DB 데이터와 완전 동기화
      // 설변 차수(E001, E002 등) 행이라도 하위 공정 대장이 기본 projectNo로 등재되어 있으면 일정/사양 데이터를 자동 바인딩
      const matchedPrimeQuote = primeQuotesByProject[pId] || primeQuotesByProject[p.projectNo] || primeQuotesByProject[p.estimateNo];
      const matchedDesign = designsByProject[pId] || designsByProject[p.projectNo];
      const matchedQuote = quotesByProject[pId] || quotesByProject[p.projectNo] || quotesByProject[p.estimateNo];
      const matchedMfg = mfgByProject[pId] || mfgByProject[p.projectNo];
      const matchedTrial = trialsByProject[pId] || trialsByProject[p.projectNo];
      const matchedMassQuote = massQuotesByProject[pId] || massQuotesByProject[p.projectNo];
      const matchedVal = validationsByProject[pId] || validationsByProject[p.projectNo];
      const matchedPpap = ppapsByProject[pId] || ppapsByProject[p.projectNo];

      let finalStep = p.currentStep;
      let isConfirmed = p.isContractConfirmed;
      let qStatus = p.quotationStatus;
      let moldVendor = p.moldVendor;
      let massVendor = p.massVendor;
      let targetT1 = p.targetT1Date;
      let actualT1 = p.actualT1Date;
      let moldDelivery = p.moldDeliveryDate;
      let targetMass = p.targetMassDate;
      let massStart = p.massStartDate;
      let kickoff = p.kickoffDate;
      let targetDays = p.targetMoldDays;
      let cavity = p.cavity;
      let material = p.material;
      let moldMaterial = p.moldMaterial;
      let resinSpec = p.resinSpec;
      let machineTon = p.machineTon;
      let partNo = p.partNo;
      let stepStatus = p.stepStatus;

      // 3-0. 원청사 견적(MpsiPrimeQuotation) 사양 바인딩
      if (matchedPrimeQuote) {
        const pqNote = matchedPrimeQuote.note || {};
        const rfq = pqNote.rfqSpec || {};
        if (!cavity && rfq.cavity) cavity = rfq.cavity;
        if (!resinSpec && rfq.resin) resinSpec = rfq.resin;
        if (!material && rfq.resin) material = rfq.resin;
        if (!moldMaterial && rfq.moldSteel) moldMaterial = rfq.moldSteel;
        if (!machineTon && rfq.tonnage) machineTon = rfq.tonnage;
        if (!partNo && Array.isArray(pqNote.partPriceItems) && pqNote.partPriceItems[0]?.partNo) {
          partNo = pqNote.partPriceItems[0].partNo;
        }
      }

      // 3-1. 금형 견적(MpsiMoldQuotation) 일정 및 사양 바인딩 (목표 T1, 금형 출고 납기, 캐비티 등)
      if (matchedQuote) {
        const q = matchedQuote;
        const qNote = q.note || {};
        if (q.QuotationStatus === '수주확정') {
          isConfirmed = true;
          qStatus = '수주확정';
          if (!isRevision) finalStep = Math.max(finalStep, 1);
        } else if (q.QuotationStatus && !isConfirmed) {
          qStatus = q.QuotationStatus;
        }
        const qVendor = qNote.selectedVendorName || qNote.vendorName || q.MoldVendorID;
        if (qVendor && qVendor !== 'WOOSUNG' && !qVendor.includes('전체')) {
          moldVendor = moldVendor || qVendor;
        }
        if (qNote.targetT1Date && !targetT1) targetT1 = qNote.targetT1Date;
        if (qNote.moldDeliveryDate && !moldDelivery) moldDelivery = qNote.moldDeliveryDate;
        if ((q.TargetMoldDays || qNote.targetMfgDays) && !targetDays) {
          targetDays = q.TargetMoldDays || qNote.targetMfgDays;
        }
        if (qNote.cavity && !cavity) cavity = qNote.cavity;
        if ((qNote.moldMaterial || qNote.moldSteel) && !moldMaterial) {
          moldMaterial = qNote.moldMaterial || qNote.moldSteel;
        }
        if (qNote.resin && !resinSpec) resinSpec = qNote.resin;
        if (qNote.machineTypeTonnage && !machineTon) machineTon = qNote.machineTypeTonnage;
      }

      // 3-2. 제품검토 및 금형설계(MpsiMoldDesign) 일정 및 진행 스텝 바인딩
      if (matchedDesign) {
        const dNote = matchedDesign.note || {};
        isConfirmed = true;
        qStatus = '수주확정';
        if (dNote.moldVendor && !moldVendor) moldVendor = dNote.moldVendor;
        if (dNote.targetT1Date) targetT1 = dNote.targetT1Date;
        if (dNote.moldDeliveryDate) moldDelivery = dNote.moldDeliveryDate;
        if (dNote.targetMfgDays) targetDays = dNote.targetMfgDays;
        if (dNote.cavity && !cavity) cavity = dNote.cavity;
        if (dNote.moldPoApprovedDate && !kickoff) {
          kickoff = String(dNote.moldPoApprovedDate).split(' ')[0];
        }
        
        if (!isRevision || designsByProject[pId]) {
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
      }

      // 3-3. 금형제작(MpsiMoldManufacture) 일정 및 진행 스텝 바인딩 (목표 T1, 금형 출고 납기, 캐비티)
      if (matchedMfg) {
        const mNote = matchedMfg.note || {};
        const mTargetT1 = matchedMfg.TargetT1Date ? formatDateOnly(matchedMfg.TargetT1Date) : mNote.targetT1Date;
        const mDelivery = matchedMfg.MoldDeliveryDate ? formatDateOnly(matchedMfg.MoldDeliveryDate) : mNote.moldDeliveryDate;
        if (mTargetT1) targetT1 = mTargetT1;
        if (mDelivery) moldDelivery = mDelivery;
        if (mNote.cavity && !cavity) cavity = mNote.cavity;
        if (mNote.material && !material) material = mNote.material;

        if (!isRevision || mfgByProject[pId]) {
          const mProg = Number(matchedMfg.OverallProgressRate ?? mNote.overallProgress ?? 0);
          if (mProg > 0 || matchedMfg.ManufactureStatus === '제작 완료' || matchedMfg.ManufactureStatus === '금형 육성 중') {
            finalStep = Math.max(finalStep, mProg >= 100 || matchedMfg.ManufactureStatus === '제작 완료' || matchedMfg.ManufactureStatus === '금형 육성 중' ? 7 : 6);
          }
        }
      }

      // 3-4. 시사출/금형육성(MpsiMoldTrial) 일정 및 진행 스텝 바인딩
      if (matchedTrial) {
        const tNote = matchedTrial.note || {};
        if (tNote.targetT1Date && !targetT1) targetT1 = tNote.targetT1Date;
        if (tNote.transferPlanDate && !moldDelivery) moldDelivery = tNote.transferPlanDate;
        if (tNote.transferActualDate) moldDelivery = tNote.transferActualDate;
        if (tNote.cavity && !cavity) cavity = tNote.cavity;
        if (tNote.massVendor && !massVendor) massVendor = tNote.massVendor;

        const firstTrialDate = Array.isArray(tNote.trials) ? tNote.trials.find((tr: any) => tr.trialDate)?.trialDate : '';
        if (firstTrialDate && !actualT1) actualT1 = firstTrialDate;

        if (!isRevision || trialsByProject[pId]) {
          if (tNote.transferActualDate) {
            finalStep = Math.max(finalStep, 11);
          } else if (tNote.isMoldApproved || matchedTrial.TrialStatus === '양산승인완료') {
            finalStep = Math.max(finalStep, 10);
          } else if (firstTrialDate || Number(tNote.currentStep || 0) > 7) {
            finalStep = Math.max(finalStep, Number(tNote.currentStep || 7));
          }
        }
      }

      // 3-5. 양산 견적(MpsiMassQuotation) 목표 양산승인일 및 사출 양산처 바인딩
      if (matchedMassQuote) {
        const mqNote = matchedMassQuote.note || {};
        if (mqNote.targetMassApprovalDate && !targetMass) {
          targetMass = mqNote.targetMassApprovalDate;
        }
        if (mqNote.massStartDate && !massStart) {
          massStart = mqNote.massStartDate;
        }
        if (mqNote.cavity && !cavity) cavity = mqNote.cavity;
        const mqVendor = mqNote.selectedVendorName || mqNote.vendorName || matchedMassQuote.MassVendorID;
        if (mqVendor && !massVendor) massVendor = mqVendor;
      }

      // 3-6. 시양산/유효성 검증(MpsiMassValidation) 목표 양산승인일 및 진행 스텝 바인딩
      if (matchedVal) {
        const vNote = matchedVal.note || {};
        const vTargetMass = matchedVal.TargetMassApprovalDate
          ? formatDateOnly(matchedVal.TargetMassApprovalDate)
          : vNote.targetMassApprovalDate;
        if (vTargetMass) targetMass = vTargetMass;
        if (vNote.moldTransferDate && !moldDelivery) moldDelivery = vNote.moldTransferDate;
        if ((matchedVal.MassVendorID || vNote.massVendor) && !massVendor) {
          massVendor = matchedVal.MassVendorID || vNote.massVendor;
        }

        if (!isRevision || validationsByProject[pId]) {
          const hasValProgress = Number(matchedVal.ReportCount || 0) > 0 || (Array.isArray(vNote.trials) && vNote.trials.some((tr: any) => tr.totalShotCount > 0));
          if (matchedVal.OverallStatus === '검증완료' || vNote.overallStatus === '검증완료') {
            finalStep = Math.max(finalStep, 12);
          } else if (hasValProgress) {
            finalStep = Math.max(finalStep, 11);
          }
        }
      }

      // 3-7. 양산 승인(MpsiMassPpap) 목표 양산승인일 및 진행 스텝 바인딩
      if (matchedPpap) {
        const ppNote = matchedPpap.note || {};
        const ppTargetMass = matchedPpap.TargetApprovalDate
          ? formatDateOnly(matchedPpap.TargetApprovalDate)
          : (ppNote.targetApprovalDate || ppNote.vendorSubmittedDate);
        if (ppTargetMass) targetMass = ppTargetMass;
        if (ppNote.partPoDate && !massStart) massStart = ppNote.partPoDate;
        if ((matchedPpap.MassVendorID || ppNote.massVendor) && !massVendor) {
          massVendor = matchedPpap.MassVendorID || ppNote.massVendor;
        }

        if (!isRevision || ppapsByProject[pId]) {
          if (matchedPpap.PpapStatus === '승인완료' || matchedPpap.PpapStatus === '양산 승인 (Pass)' || ppNote.ppapStatus === '승인완료' || ppNote.ppapStatus === '양산 승인 (Pass)') {
            finalStep = Math.max(finalStep, 13);
            stepStatus = '완료';
          } else if (Array.isArray(ppNote.packageSubmissions) && ppNote.packageSubmissions.length > 0) {
            finalStep = Math.max(finalStep, 12);
          }
        }
      }

      const cleanedStepNameCustom = (finalStep > 0 && (p.stepNameCustom === '고객 답변 대기' || p.stepNameCustom === '수주 미성사'))
        ? undefined
        : p.stepNameCustom;

      return {
        ...p,
        partNo,
        cavity,
        material,
        moldMaterial,
        resinSpec,
        machineTon,
        currentStep: finalStep,
        stepNameCustom: cleanedStepNameCustom,
        isContractConfirmed: isConfirmed,
        isQuotePending: !isConfirmed,
        quotationStatus: qStatus,
        moldVendor,
        massVendor,
        kickoffDate: kickoff,
        targetT1Date: targetT1,
        actualT1Date: actualT1,
        moldDeliveryDate: moldDelivery,
        targetMassDate: targetMass,
        massStartDate: massStart,
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
    const moldNo = body.moldNo !== undefined ? body.moldNo : '';
    const moldDegree = body.moldDegree !== undefined ? body.moldDegree : '';
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
      isPromotedFromQuote: Boolean(body.isPromotedFromQuote),
      isRegistrationCompleted: Boolean(body.isRegistrationCompleted),
      moldProductionType: body.moldProductionType || 'OUTSOURCING',
      moldVendor: body.moldVendor !== undefined ? body.moldVendor : '',
      massProductionType: body.massProductionType || 'OUTSOURCING',
      massVendor: body.massVendor !== undefined ? body.massVendor : '',
      cavity: body.cavity !== undefined ? body.cavity : '',
      material: body.material !== undefined ? body.material : '',
      partWeight: body.partWeight !== undefined ? body.partWeight : '',
      annualVolume: body.annualVolume !== undefined ? body.annualVolume : '',
      machineTon: body.machineTon !== undefined ? body.machineTon : '',
      hrsSpec: body.hrsSpec !== undefined ? body.hrsSpec : '',
      moldMaterial: body.moldMaterial !== undefined ? body.moldMaterial : '',
      resinSpec: body.resinSpec !== undefined ? body.resinSpec : '',
      warrantyShots: body.warrantyShots !== undefined ? body.warrantyShots : '',
      registeredDate: body.registeredDate || new Date().toISOString().split('T')[0],
      quoteSubmitDate: body.quoteSubmitDate || '',
      orderDate: body.orderDate || '',
      kickoffDate: body.kickoffDate || '',
      targetMoldDays: body.targetMoldDays || '',
      targetT1Date: body.targetT1Date || '',
      actualT1Date: body.actualT1Date || '',
      moldDeliveryDate: body.moldDeliveryDate || '',
      targetMassDate: body.targetMassDate || '',
      massStartDate: body.massStartDate || '',
      currentStep: body.currentStep !== undefined ? Number(body.currentStep) : 0,
      stepStatus: body.stepStatus || '',
      stepNameCustom: body.stepNameCustom || '',
      trialDegree: body.trialDegree || '',
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

    // 설계변경(E001, E002 등) 또는 추가금형(M2 등) 차수는 기존 신작(N001) 이력을 덮어쓰지 않고 별도 행으로 영구 보존되도록 DB ProjectID 복합키 구성
    const dbProjectId = (changeType && changeType !== 'N001')
      ? `${projectNo}__${changeType}`
      : (moldDegree && moldDegree !== 'M1' ? `${projectNo}__${moldDegree}` : projectNo);

    const params = [
      enterpriseId,                                // $1 EnterpriseID
      body.siteId || 'SITE_01',                    // $2 SiteID
      body.plantId || 'PLANT_01',                  // $3 PlantID
      dbProjectId,                                 // $4 ProjectID (차수별 분리 저장)
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
        [dbProjectId, fullDetails.currentStep, fullDetails.stepNameCustom || '진행', fullDetails.stepStatus]
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

    let cur = { rows: [] as any[] };
    if (body.id) {
      cur = await query(
        'SELECT * FROM "ProjectMaster" WHERE "EnterpriseID" = $1 AND "ProjectMasterSequenceNo" = $2',
        [enterpriseId, Number(body.id)]
      );
    }
    if (cur.rows.length === 0 && body.changeType && body.changeType !== 'N001') {
      cur = await query(
        'SELECT * FROM "ProjectMaster" WHERE "EnterpriseID" = $1 AND ("ProjectID" = $2 OR ("ProjectID" = $3 AND "DivisionID" = $4)) ORDER BY "ProjectMasterSequenceNo" DESC LIMIT 1',
        [enterpriseId, `${body.projectNo}__${body.changeType}`, body.projectNo, body.changeType]
      );
    }
    if (cur.rows.length === 0) {
      cur = await query(
        'SELECT * FROM "ProjectMaster" WHERE "EnterpriseID" = $1 AND "ProjectID" = $2 ORDER BY "ProjectMasterSequenceNo" DESC LIMIT 1',
        [enterpriseId, body.projectNo]
      );
    }

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
      WHERE "EnterpriseID" = $12 AND "ProjectMasterSequenceNo" = $13
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
      row.ProjectMasterSequenceNo,
    ];

    const res = await query(updateSql, params);

    // 하위 연계 대장(MpsiMoldQuotation, MpsiMoldDesign, MpsiMoldManufacture, MpsiMoldTrial) 자동 Cascade 동기화
    try {
      const pjtId = body.projectNo;
      const syncFields: Record<string, any> = {};
      if (body.moldDegree !== undefined) syncFields.moldDegree = body.moldDegree;
      if (body.moldNo !== undefined) syncFields.moldNo = body.moldNo;
      if (body.changeType !== undefined) syncFields.changeType = body.changeType;
      if (body.productName !== undefined) syncFields.productName = body.productName;
      if (body.projectName !== undefined) syncFields.projectName = body.projectName;
      if (body.customerName !== undefined) syncFields.customerName = body.customerName;
      if (body.moldVendor !== undefined) syncFields.moldVendor = body.moldVendor;
      if (body.massVendor !== undefined) syncFields.massVendor = body.massVendor;
      if (body.cavity !== undefined) syncFields.cavity = body.cavity;
      if (body.material !== undefined) syncFields.material = body.material;
      if (body.moldMaterial !== undefined) syncFields.moldMaterial = body.moldMaterial;
      if (body.targetT1Date !== undefined) syncFields.targetT1Date = body.targetT1Date;
      if (body.moldDeliveryDate !== undefined) syncFields.moldDeliveryDate = body.moldDeliveryDate;

      if (Object.keys(syncFields).length > 0) {
        // 1. MpsiMoldQuotation 동기화
        const mqRes = await query(`SELECT "QuotationSequenceNo", "Note" FROM "MpsiMoldQuotation" WHERE "ProjectID" = $1`, [pjtId]);
        for (const mqRow of mqRes.rows) {
          let n = {};
          try { n = JSON.parse(mqRow.Note || '{}'); } catch {}
          Object.assign(n, syncFields);
          await query(`UPDATE "MpsiMoldQuotation" SET "Note" = $1, "ModificationDateTime" = NOW() WHERE "QuotationSequenceNo" = $2`, [JSON.stringify(n), mqRow.QuotationSequenceNo]);
        }

        // 2. MpsiMoldDesign 동기화
        const mdRes = await query(`SELECT "DesignSequenceNo", "Note" FROM "MpsiMoldDesign" WHERE "ProjectID" = $1`, [pjtId]);
        for (const mdRow of mdRes.rows) {
          let n = {};
          try { n = JSON.parse(mdRow.Note || '{}'); } catch {}
          Object.assign(n, syncFields);
          await query(`UPDATE "MpsiMoldDesign" SET "Note" = $1 WHERE "DesignSequenceNo" = $2`, [JSON.stringify(n), mdRow.DesignSequenceNo]);
        }

        // 3. MpsiMoldManufacture 동기화
        const mfRes = await query(`SELECT "ManufactureSequenceNo", "Note" FROM "MpsiMoldManufacture" WHERE "ProjectID" = $1`, [pjtId]);
        for (const mfRow of mfRes.rows) {
          let n = {};
          try { n = JSON.parse(mfRow.Note || '{}'); } catch {}
          Object.assign(n, syncFields);
          await query(`UPDATE "MpsiMoldManufacture" SET "Note" = $1, "ModificationDateTime" = NOW() WHERE "ManufactureSequenceNo" = $2`, [JSON.stringify(n), mfRow.ManufactureSequenceNo]);
        }

        // 4. MpsiMoldTrial 동기화
        const mtRes = await query(`SELECT "TrialSequenceNo", "Note" FROM "MpsiMoldTrial" WHERE "ProjectID" = $1`, [pjtId]);
        for (const mtRow of mtRes.rows) {
          let n = {};
          try { n = JSON.parse(mtRow.Note || '{}'); } catch {}
          Object.assign(n, syncFields);
          await query(`UPDATE "MpsiMoldTrial" SET "Note" = $1 WHERE "TrialSequenceNo" = $2`, [JSON.stringify(n), mtRow.TrialSequenceNo]);
        }
      }
    } catch (cascadeErr) {
      console.warn('[PUT /api/v1/projects Cascade Sync Warning]', cascadeErr);
    }

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
    const idParam = searchParams.get('id');
    const changeType = searchParams.get('changeType');
    const enterpriseId = process.env.NEXT_PUBLIC_NODE_ID || 'MPSI_HQ';

    if (!projectNo && !idParam) {
      return NextResponse.json({ success: false, error: '삭제할 projectNo 또는 id가 지정되지 않았습니다.' }, { status: 400 });
    }

    if (idParam && !isNaN(Number(idParam))) {
      const delRes = await query(
        `UPDATE "ProjectMaster" 
         SET "UseIndicator" = FALSE, 
             "ModificationDateTime" = NOW() 
         WHERE "EnterpriseID" = $1 AND "ProjectMasterSequenceNo" = $2
         RETURNING *`,
        [enterpriseId, Number(idParam)]
      );
      if (delRes.rows.length > 0) {
        return NextResponse.json({
          success: true,
          message: `프로젝트 [${projectNo || idParam}] (${changeType || '단일 차수'})가 삭제 처리되었습니다.`,
        });
      }
    }

    if (changeType && changeType !== 'N001' && projectNo) {
      await query(
        `UPDATE "ProjectMaster" 
         SET "UseIndicator" = FALSE, 
             "ModificationDateTime" = NOW() 
         WHERE "EnterpriseID" = $1 AND ("ProjectID" = $2 OR ("ProjectID" = $3 AND "DivisionID" = $4))`,
        [enterpriseId, `${projectNo}__${changeType}`, projectNo, changeType]
      );
    } else {
      // 물리 삭제 대신 국가표준 UseIndicator 플래그를 FALSE(삭제/비활성)로 업데이트
      await query(
        `UPDATE "ProjectMaster" 
         SET "UseIndicator" = FALSE, 
             "ModificationDateTime" = NOW() 
         WHERE "EnterpriseID" = $1 AND "ProjectID" = $2`,
        [enterpriseId, projectNo]
      );
    }

    return NextResponse.json({
      success: true,
      message: `프로젝트 [${projectNo}]의 상태 플래그(UseIndicator)가 삭제(FALSE) 처리되었습니다.`,
    });
  } catch (error: any) {
    console.error('DELETE /api/v1/projects error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
