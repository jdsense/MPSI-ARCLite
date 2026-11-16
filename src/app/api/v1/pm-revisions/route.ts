import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { syncDownstreamToProjectMaster } from '@/lib/project-master-sync';

function parseNote(raw: any): any {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function formatDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return '';
    // "2026. 07.05" or "2026.07.05" -> "2026-07-05"
    const dotted = trimmed.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
    if (dotted) {
      return `${dotted[1]}-${dotted[2].padStart(2, '0')}-${dotted[3].padStart(2, '0')}`;
    }
    return trimmed.split('T')[0];
  }
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).split('T')[0];
}

function toValidDateOrFallback(val: any, fallbackToday = true): string | null {
  const f = formatDate(val);
  if (/^\d{4}-\d{2}-\d{2}$/.test(f) && !isNaN(Date.parse(f))) {
    return f;
  }
  return fallbackToday ? new Date().toISOString().slice(0, 10) : null;
}

async function ensureNoteColumns() {
  const alters = [
    `ALTER TABLE "MpsiPmRevisionMaster" ADD COLUMN IF NOT EXISTS "Note" TEXT`,
    `ALTER TABLE "MpsiPmRound" ADD COLUMN IF NOT EXISTS "Note" TEXT`,
    `ALTER TABLE "MpsiRevisionHistory" ADD COLUMN IF NOT EXISTS "Note" TEXT`,
  ];
  for (const sql of alters) {
    try {
      await query(sql);
    } catch {
      // ignore if already exists or lacks permission
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureNoteColumns();

    const { searchParams } = new URL(request.url);
    const projectNo = searchParams.get('projectNo')?.trim() || '';
    const mode = searchParams.get('mode')?.trim() || '';

    // 1. ProjectMaster 조회 (동일 projectNo의 모든 리비전 N001, E001... 포함)
    const pmRows = (
      await query(
        `SELECT * FROM "ProjectMaster" WHERE ("UseIndicator" IS TRUE OR "UseIndicator" IS NULL) ORDER BY "ProjectMasterSequenceNo" ASC`
      )
    ).rows;

    // 2. PM 마스터 및 점검 라운드, 설변 이력, 공정 테이블 DB 조회
    let pmMasters: any[] = [];
    let pmRounds: any[] = [];
    let revHistories: any[] = [];
    let moldQuotes: any[] = [];
    let massQuotes: any[] = [];
    let moldTrials: any[] = [];
    let massVals: any[] = [];
    let massPpaps: any[] = [];

    try { pmMasters = (await query(`SELECT * FROM "MpsiPmRevisionMaster"`)).rows; } catch {}
    try { pmRounds = (await query(`SELECT * FROM "MpsiPmRound" ORDER BY "RoundNumber" ASC`)).rows; } catch {}
    try { revHistories = (await query(`SELECT * FROM "MpsiRevisionHistory" ORDER BY "RevisionSequenceNo" ASC`)).rows; } catch {}
    try { moldQuotes = (await query(`SELECT * FROM "MpsiMoldQuotation"`)).rows; } catch {}
    try { massQuotes = (await query(`SELECT * FROM "MpsiMassQuotation"`)).rows; } catch {}
    try { moldTrials = (await query(`SELECT * FROM "MpsiMoldTrial"`)).rows; } catch {}
    try { massVals = (await query(`SELECT * FROM "MpsiMassValidation"`)).rows; } catch {}
    try { massPpaps = (await query(`SELECT * FROM "MpsiMassPpap"`)).rows; } catch {}

    // 프로젝트 번호별 그룹핑
    const groupedProjects = new Map<string, any[]>();
    for (const row of pmRows) {
      const n = parseNote(row.Note);
      const baseNo = (n.projectNo || String(row.ProjectID || '').split('__')[0] || '').trim();
      if (!baseNo || baseNo.toUpperCase().startsWith('Q')) continue;
      if (projectNo && baseNo.toUpperCase() !== projectNo.toUpperCase()) continue;
      if (!groupedProjects.has(baseNo)) groupedProjects.set(baseNo, []);
      groupedProjects.get(baseNo)!.push({ row, note: n });
    }

    const results: any[] = [];
    const fullItems: any[] = [];

    for (const [baseNo, entries] of groupedProjects.entries()) {
      const upperNo = baseNo.toUpperCase();
      const matchedPmMaster = pmMasters.find((m) => String(m.ProjectID || '').toUpperCase().split('__')[0] === upperNo);
      const pmMasterNote = parseNote(matchedPmMaster?.Note);

      const matchedRounds = matchedPmMaster
        ? pmRounds.filter((r) => r.PmMasterID === matchedPmMaster.PmMasterID)
        : [];
      const matchedRevRows = revHistories.filter((h) => String(h.ProjectID || '').toUpperCase().split('__')[0] === upperNo);

      const matchedMoldQ = moldQuotes.find((q) => {
        const qn = parseNote(q.Note);
        return [q.ProjectID, qn.officialProjectNo, qn.projectNo].some((k) => k && String(k).toUpperCase() === upperNo);
      });
      const matchedMassQ = massQuotes.find((q) => {
        const qn = parseNote(q.Note);
        return [q.ProjectID, qn.officialProjectNo, qn.projectNo].some((k) => k && String(k).toUpperCase() === upperNo);
      });
      const matchedTrial = moldTrials.find((t) => {
        const tn = parseNote(t.Note);
        return [t.ProjectID, tn.projectNo].some((k) => k && String(k).toUpperCase() === upperNo);
      });
      const matchedVal = massVals.find((v) => {
        const vn = parseNote(v.Note);
        return [v.ProjectID, vn.officialProjectNo, vn.projectNo].some((k) => k && String(k).toUpperCase() === upperNo);
      });
      const matchedPpap = massPpaps.find((p) => {
        const pn = parseNote(p.Note);
        return [p.ProjectID, pn.officialProjectNo, pn.projectNo].some((k) => k && String(k).toUpperCase() === upperNo);
      });

      const historyList: any[] = [];

      // DB ProjectMaster 차수별 행(N001, E001...) + 공정 테이블 실제 데이터 기반 이력 구성
      for (const { row, note } of entries) {
        const revCode = row.DivisionID || note.changeType || 'N001';
        const isRev = revCode.startsWith('E');
        const dbRev = matchedRevRows.find((h) => String(h.RevisionCode || '').toUpperCase() === revCode.toUpperCase());
        const dbRevNote = parseNote(dbRev?.Note);

        // 1. 모델 검토 내용
        const modelReview = dbRev?.ChangeReason
          ? dbRev.ChangeReason
          : isRev
          ? (note.notes || `설계변경(${revCode}) 도면 접수 및 3D 형상 검토`)
          : `초도 제품 사양 등록 (수지: ${note.resinSpec || note.material || '-'}, 캐비티: ${note.cavity || '-'})`;

        // 2. 금형/사출 견적 내용
        const mqNote = parseNote(matchedMoldQ?.Note);
        const massQNote = parseNote(matchedMassQ?.Note);
        const moldAmt = matchedMoldQ?.FinalNegotiatedAmount || matchedMoldQ?.TotalQuotationAmount;
        const massPrice = massQNote?.finalConfirmedPrice || massQNote?.unitPrice;
        let quoteSummary = '';
        if (dbRev?.ChangeAmount && Number(dbRev.ChangeAmount) > 0) {
          quoteSummary = `변경 견적 금액: ${Number(dbRev.ChangeAmount).toLocaleString()}원 (${dbRev.ApprovalStatus || '검토중'})`;
        } else {
          const parts: string[] = [];
          if (moldAmt) parts.push(`금형 견적: ${Number(moldAmt).toLocaleString()}원 (${matchedMoldQ.QuotationStatus || mqNote.status || '-'})`);
          if (massPrice) parts.push(`사출 단가: ${Number(massPrice).toLocaleString()}원/EA (${massQNote.status || '-'})`);
          quoteSummary = parts.length > 0 ? parts.join(' / ') : 'DB에 등록된 견적 확정 내역이 없습니다.';
        }

        // 3. 시사출 보고서 내용
        const trNote = parseNote(matchedTrial?.Note);
        const trialList = Array.isArray(trNote?.trials) ? trNote.trials : [];
        let trialSummary = '시사출 실적 미등록';
        if (matchedTrial) {
          const deg = trNote.currentTrial || matchedTrial.TrialDegree || 'T1';
          const status = matchedTrial.TrialStatus || trNote.trialStatus || '진행중';
          trialSummary = `${note.moldVendor || '금형처'} ${deg} 시사출 (${status}${trialList.length > 0 ? `, 차수 ${trialList.length}회` : ''})`;
        }

        // 4. 양산처 시양산/PPAP 보고서 내용
        const valNote = parseNote(matchedVal?.Note);
        const ppapNote = parseNote(matchedPpap?.Note);
        const lastValTrial = Array.isArray(valNote?.trials) && valNote.trials.length > 0 ? valNote.trials[valNote.trials.length - 1] : null;
        let massSummary = '시양산 실적 미등록';
        if (matchedVal || matchedPpap) {
          const parts: string[] = [];
          if (matchedVal) {
            parts.push(`시양산 상태: ${matchedVal.OverallStatus || valNote.overallStatus || '-'}${lastValTrial?.measuredCpk ? ` (Cpk ${lastValTrial.measuredCpk})` : ''}`);
          }
          if (matchedPpap) {
            parts.push(`PPAP: ${matchedPpap.PpapStatus || ppapNote.ppapStatus || '-'}`);
          }
          massSummary = parts.join(' / ');
        }

        const revDate = dbRev?.AppliedDate
          ? formatDate(dbRev.AppliedDate)
          : note.orderDate || note.registeredDate || formatDate(row.ModificationDateTime || row.CreationDateTime);

        historyList.push({
          revisionCode: revCode,
          revisionDate: revDate || '-',
          title: isRev ? `설계변경 (${revCode})` : `초도 신작 프로젝트 (${revCode})`,
          modelReview,
          moldCostQuote: quoteSummary,
          moldTrialReport: trialSummary,
          massValidationReport: massSummary,
          author: note.massVendor || note.moldVendor || 'MPSI',
          memo: dbRevNote?.memo || note.notes || (isRev ? `설계변경 ${revCode} 이력` : '신규 프로젝트 등록'),
          createdAt: formatDate(row.ModificationDateTime || row.CreationDateTime) || revDate || '-',
        });
      }

      // MpsiRevisionHistory에만 별도 기록된 차수가 있는 경우 추가
      for (const h of matchedRevRows) {
        const code = String(h.RevisionCode || '');
        const hNote = parseNote(h.Note);
        if (code && !historyList.some((x) => x.revisionCode.toUpperCase() === code.toUpperCase())) {
          historyList.push({
            revisionCode: code,
            revisionDate: formatDate(h.AppliedDate) || '-',
            title: `설계변경 (${code})`,
            modelReview: h.ChangeReason || '-',
            moldCostQuote: h.ChangeAmount && Number(h.ChangeAmount) > 0 ? `${Number(h.ChangeAmount).toLocaleString()}원 (${h.ApprovalStatus || '-'})` : '-',
            moldTrialReport: '-',
            massValidationReport: '-',
            author: hNote?.author || 'MPSI',
            memo: hNote?.memo || h.ApprovalStatus || '-',
            createdAt: formatDate(h.AppliedDate) || '-',
          });
        }
      }

      const latestEntry = entries[entries.length - 1];
      const latestRow = latestEntry.row;
      const latestNote = latestEntry.note;
      const latestRevCode =
        matchedPmMaster?.ActiveRevisionCode ||
        latestRow.DivisionID ||
        latestNote.changeType ||
        'N001';

      // roundsData 복원 (MpsiPmRevisionMaster.Note.pmData.roundsData + MpsiPmRound 행 병합)
      const roundsData: Record<number, any> = {
        ...(pmMasterNote?.pmData?.roundsData || {}),
      };
      for (const r of matchedRounds) {
        const rNum = Number(r.RoundNumber || 1);
        const rNote = parseNote(r.Note);
        roundsData[rNum] = {
          ...(roundsData[rNum] || {}),
          ...rNote,
          round: rNum,
          activeProcess: rNote.activeProcess || r.PmChecklistFile || roundsData[rNum]?.activeProcess || '금형 분해 점검 중',
        };
      }

      const trialNote = parseNote(matchedTrial?.Note);
      const valNote = parseNote(matchedVal?.Note);
      const ppapNote = parseNote(matchedPpap?.Note);
      const latestRevRow = matchedRevRows.find(
        (h) => String(h.RevisionCode || '').toUpperCase() === String(latestRevCode).toUpperCase()
      ) || matchedRevRows[matchedRevRows.length - 1];
      const latestRevNote = parseNote(latestRevRow?.Note);

      const defaultState = String(latestRevCode).toUpperCase().startsWith('E') ? '설변 중' : '양산 중';
      const currentState = pmMasterNote?.currentState || defaultState;

      const resolvedMassVendor =
        latestNote.massVendor ||
        parseNote(matchedMassQ?.Note)?.selectedVendorName ||
        matchedMassQ?.MassVendorID ||
        matchedVal?.MassVendorID ||
        matchedPpap?.MassVendorID ||
        trialNote?.massVendor ||
        '';

      const latestValTrial = Array.isArray(valNote?.trials) && valNote.trials.length > 0
        ? valNote.trials[valNote.trials.length - 1]
        : null;

      const lastSubmittedPpap = Array.isArray(ppapNote?.packageSubmissions) && ppapNote.packageSubmissions.length > 0
        ? ppapNote.packageSubmissions[ppapNote.packageSubmissions.length - 1]
        : null;

      const resolvedWarranty = Number(
        String(latestNote.warrantyShots ?? pmMasterNote?.pmData?.warrantyShots ?? 0).replace(/[^0-9]/g, '')
      ) || 0;

      const latestRoundObj = matchedRounds[matchedRounds.length - 1];
      const latestRoundNote = parseNote(latestRoundObj?.Note);
      const currentRoundNum =
        Number(pmMasterNote?.pmData?.currentRound || latestRoundObj?.RoundNumber || 1);

      const resolvedMassStartDate =
        pmMasterNote?.massStartDate ||
        latestRevNote?.revisionMassStartDate ||
        latestNote.massStartDate ||
        latestRoundNote?.schedule?.actualMassStartDate ||
        '';

      const currentStepNum = Number(latestNote.currentStep || 1);
      const defaultProgressProcess =
        pmMasterNote?.progressProcess ||
        latestRoundNote?.activeProcess ||
        (currentStepNum >= 13 ? '양산 납품 중' : currentStepNum >= 11 ? '시양산 진행 중' : '가공 중');

      const revisionMemos = Array.isArray(pmMasterNote?.revisionMemos)
        ? pmMasterNote.revisionMemos
        : Array.isArray(latestRevNote?.revisionMemos)
        ? latestRevNote.revisionMemos
        : [];

      const pmMemos = Array.isArray(pmMasterNote?.pmData?.memos)
        ? pmMasterNote.pmData.memos
        : [];

      const pmDataObj = {
        currentRound: currentRoundNum,
        currentShots: matchedPmMaster?.CumulativeShotCount ?? pmMasterNote?.pmData?.currentShots ?? 0,
        pmReason: pmMasterNote?.pmData?.pmReason || latestRoundNote?.pmReason || '',
        lastPmDate: formatDate(pmMasterNote?.pmData?.lastPmDate || latestRoundNote?.lastPmDate || ''),
        lastPmShots: pmMasterNote?.pmData?.lastPmShots ?? latestRoundNote?.lastPmShots ?? 0,
        massStartDate: formatDate(pmMasterNote?.pmData?.massStartDate || resolvedMassStartDate || ''),
        warrantyShots: resolvedWarranty,
        pmCycleShots: matchedPmMaster?.PmTargetShotInterval ?? pmMasterNote?.pmData?.pmCycleShots ?? 40000,
        activeProcess: pmMasterNote?.pmData?.activeProcess || latestRoundNote?.activeProcess || '금형 분해 점검 중',
        schedule: {
          planStartDate: formatDate(pmMasterNote?.pmData?.schedule?.planStartDate || latestRoundNote?.schedule?.planStartDate || ''),
          planEndDate: formatDate(pmMasterNote?.pmData?.schedule?.planEndDate || latestRoundNote?.schedule?.planEndDate || ''),
          planMassStartDate: formatDate(pmMasterNote?.pmData?.schedule?.planMassStartDate || latestRoundNote?.schedule?.planMassStartDate || ''),
          actualStartDate: formatDate(pmMasterNote?.pmData?.schedule?.actualStartDate || latestRoundNote?.schedule?.actualStartDate || ''),
          actualEndDate: formatDate(pmMasterNote?.pmData?.schedule?.actualEndDate || latestRoundNote?.schedule?.actualEndDate || ''),
          actualMassStartDate: formatDate(pmMasterNote?.pmData?.schedule?.actualMassStartDate || latestRoundNote?.schedule?.actualMassStartDate || ''),
        },
        roundsData,
        memos: pmMemos,
      };

      const isSelfMass =
        latestNote.massProductionType === 'IN_HOUSE' ||
        resolvedMassVendor.includes('자체') ||
        resolvedMassVendor.trim().toUpperCase() === 'MPSI';
      const normalizedMassVendor = isSelfMass && !resolvedMassVendor
        ? 'MPSI 자체사출공장'
        : resolvedMassVendor;

      const fullItem = {
        id: Number(latestRow.ProjectMasterSequenceNo),
        projectNo: baseNo,
        revisionCode: latestRevCode,
        quotationKind: pmMasterNote?.quotationKind || (String(latestRevCode).toUpperCase().startsWith('E') ? '(금형견적, 사출견적)' : '신작견적'),
        projectName: latestNote.projectName || latestRow.ProjectName || '-',
        productName: latestNote.productName || latestRow.ProjectName || '-',
        partNo: latestRow.ItemID || latestNote.partNo || '-',
        moldNo: latestNote.moldNo || baseNo.replace(/P\d+$/i, ''),
        customerName: latestNote.customerName || latestRow.PersonInChargeID || '-',
        cavity: latestNote.cavity || '-',
        moldVendor: latestNote.moldVendor || '-',
        massVendor: normalizedMassVendor,
        massProductionType: isSelfMass ? 'IN_HOUSE' : 'OUTSOURCING',
        warrantyShots: resolvedWarranty,
        currentState,
        lastTransitionReason: pmMasterNote?.lastTransitionReason || pmMasterNote?.stateTransitionLogs?.[0]?.reason || '',
        stateTransitionLogs: Array.isArray(pmMasterNote?.stateTransitionLogs) ? pmMasterNote.stateTransitionLogs : [],
        moldModStartDate: formatDate(latestNote.orderDate || latestNote.kickoffDate || latestNote.registeredDate) || '-',
        progressProcess: defaultProgressProcess,
        moldModEndDate: formatDate(latestNote.moldDeliveryDate || trialNote?.transferActualDate) || '-',
        pilotMassDate: formatDate(latestValTrial?.testDate || latestNote.targetT1Date) || '-',
        ppapSubmitDate: formatDate(ppapNote?.vendorSubmittedDate || lastSubmittedPpap?.submittedAt?.split(' ')[0]) || '-',
        mpsiApprovalDate: formatDate(ppapNote?.partPoDate) || '-',
        massStartDate: formatDate(resolvedMassStartDate) || '공급업체입력',
        revisionMassStartDate: formatDate(pmMasterNote?.revisionMassStartDate || latestRevNote?.revisionMassStartDate || resolvedMassStartDate),
        revisionMemos,
        pmData: pmDataObj,
        historyList,
        updatedAt: formatDate(latestRow.ModificationDateTime || latestRow.CreationDateTime) || '-',
      };

      fullItems.push(fullItem);

      results.push({
        projectNo: baseNo,
        hasPmMaster: Boolean(matchedPmMaster),
        cumulativeShotCount: matchedPmMaster ? Number(matchedPmMaster.CumulativeShotCount || 0) : null,
        pmTargetShotInterval: matchedPmMaster ? Number(matchedPmMaster.PmTargetShotInterval || 0) : null,
        nextPmScheduledDate: matchedPmMaster?.NextPmScheduledDate ? formatDate(matchedPmMaster.NextPmScheduledDate) : null,
        activeRevisionCode: latestRevCode,
        latestPmRound: latestRoundObj
          ? {
              roundNumber: latestRoundObj.RoundNumber,
              inspectionDate: formatDate(latestRoundObj.InspectionDate),
              inspectorName: latestRoundObj.InspectorName,
              pmStatus: latestRoundObj.PmStatus,
            }
          : null,
        historyList,
      });
    }

    if (mode === 'full') {
      return NextResponse.json({
        success: true,
        data: projectNo ? (fullItems[0] || null) : fullItems,
      });
    }

    return NextResponse.json({
      success: true,
      data: projectNo ? (results[0] || null) : results,
    });
  } catch (error: any) {
    console.error('GET /api/v1/pm-revisions error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureNoteColumns();
    const body = await request.json();
    const item = body.item || body;
    const projectNo = (item?.projectNo || body.projectNo || '').trim();

    if (!projectNo) {
      return NextResponse.json({ success: false, error: 'projectNo is required' }, { status: 400 });
    }

    const baseProjectNo = projectNo.split('__')[0];
    const pmMasterId = `PM-${baseProjectNo}`;
    const revisionCode = String(item.revisionCode || body.revisionCode || 'E001').toUpperCase();
    const author = body.author || item.massVendor || '(주)뉴몰드';

    // 1. 기존 MpsiPmRevisionMaster 확인 및 UPSERT
    const existingMaster = await query(
      `SELECT * FROM "MpsiPmRevisionMaster" WHERE "PmMasterID" = $1 OR "ProjectID" = $2`,
      [pmMasterId, baseProjectNo]
    );

    const prevMasterNote = parseNote(existingMaster.rows[0]?.Note);
    const mergedPmData = {
      ...(prevMasterNote.pmData || {}),
      ...(item.pmData || {}),
      roundsData: {
        ...(prevMasterNote.pmData?.roundsData || {}),
        ...(item.pmData?.roundsData || {}),
      },
      memos: item.pmData?.memos !== undefined ? item.pmData.memos : (prevMasterNote.pmData?.memos || []),
    };

    if (body.roundData && body.roundData.round) {
      mergedPmData.roundsData[body.roundData.round] = body.roundData;
      mergedPmData.currentRound = Number(body.roundData.round);
    }

    const cumShots =
      Number(String(mergedPmData.currentShots ?? body.roundData?.currentShots ?? existingMaster.rows[0]?.CumulativeShotCount ?? 0).replace(/[^0-9]/g, '')) || 0;
    const cycleShots =
      Number(String(mergedPmData.pmCycleShots ?? body.roundData?.pmCycleShots ?? existingMaster.rows[0]?.PmTargetShotInterval ?? 40000).replace(/[^0-9]/g, '')) || 40000;
    const nextPmDate = toValidDateOrFallback(
      mergedPmData.schedule?.planStartDate || body.roundData?.schedule?.planStartDate,
      false
    );

    const masterNotePayload = {
      ...prevMasterNote,
      projectNo: baseProjectNo,
      quotationKind: item.quotationKind ?? prevMasterNote.quotationKind,
      currentState: item.currentState ?? prevMasterNote.currentState ?? (revisionCode.startsWith('E') ? '설변 중' : '양산 중'),
      lastTransitionReason: item.lastTransitionReason ?? prevMasterNote.lastTransitionReason ?? '',
      stateTransitionLogs: item.stateTransitionLogs !== undefined ? item.stateTransitionLogs : (prevMasterNote.stateTransitionLogs || []),
      progressProcess: item.progressProcess ?? prevMasterNote.progressProcess,
      massStartDate: item.massStartDate && item.massStartDate !== '공급업체입력'
        ? item.massStartDate
        : prevMasterNote.massStartDate,
      revisionMassStartDate: item.revisionMassStartDate ?? prevMasterNote.revisionMassStartDate,
      revisionMemos: item.revisionMemos !== undefined ? item.revisionMemos : (prevMasterNote.revisionMemos || []),
      pmData: mergedPmData,
    };

    if (existingMaster.rows.length > 0) {
      await query(
        `UPDATE "MpsiPmRevisionMaster"
         SET "CumulativeShotCount" = $1,
             "PmTargetShotInterval" = $2,
             "NextPmScheduledDate" = COALESCE($3, "NextPmScheduledDate"),
             "ActiveRevisionCode" = $4,
             "Note" = $5
         WHERE "PmSequenceNo" = $6`,
        [
          cumShots,
          cycleShots,
          nextPmDate,
          revisionCode,
          JSON.stringify(masterNotePayload),
          existingMaster.rows[0].PmSequenceNo,
        ]
      );
    } else {
      const seqRes = await query(`SELECT COALESCE(MAX("PmSequenceNo"), 0) + 1 AS next_seq FROM "MpsiPmRevisionMaster"`);
      const nextSeq = Number(seqRes.rows[0]?.next_seq || 1);
      await query(
        `INSERT INTO "MpsiPmRevisionMaster" (
          "PmSequenceNo", "PmMasterID", "ProjectID", "CumulativeShotCount",
          "PmTargetShotInterval", "NextPmScheduledDate", "ActiveRevisionCode", "CreationDateTime", "Note"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
        [
          nextSeq,
          pmMasterId,
          baseProjectNo,
          cumShots,
          cycleShots,
          nextPmDate,
          revisionCode,
          JSON.stringify(masterNotePayload),
        ]
      );
    }

    // 2. 차수별 PM 데이터(MpsiPmRound) UPSERT
    if (body.roundData && body.roundData.round) {
      const rd = body.roundData;
      const roundNum = Number(rd.round);
      const roundId = `${pmMasterId}-R${roundNum}`;
      const inspectionDate = toValidDateOrFallback(
        rd.schedule?.actualEndDate || rd.schedule?.actualStartDate || rd.schedule?.planStartDate || rd.lastPmDate,
        true
      );
      const pmStatus = rd.activeProcess === '양산 대기 중' ? '완료' : '진행중';

      const existingRound = await query(
        `SELECT "PmRoundSequenceNo" FROM "MpsiPmRound" WHERE "RoundID" = $1 OR ("PmMasterID" = $2 AND "RoundNumber" = $3)`,
        [roundId, pmMasterId, roundNum]
      );

      if (existingRound.rows.length > 0) {
        await query(
          `UPDATE "MpsiPmRound"
           SET "InspectionDate" = $1,
               "InspectorName" = $2,
               "PmChecklistFile" = $3,
               "PmStatus" = $4,
               "Note" = $5
           WHERE "PmRoundSequenceNo" = $6`,
          [
            inspectionDate,
            String(author).slice(0, 50),
            String(rd.activeProcess || '').slice(0, 255),
            pmStatus,
            JSON.stringify(rd),
            existingRound.rows[0].PmRoundSequenceNo,
          ]
        );
      } else {
        const rSeqRes = await query(`SELECT COALESCE(MAX("PmRoundSequenceNo"), 0) + 1 AS next_seq FROM "MpsiPmRound"`);
        const nextRSeq = Number(rSeqRes.rows[0]?.next_seq || 1);
        await query(
          `INSERT INTO "MpsiPmRound" (
            "PmRoundSequenceNo", "RoundID", "PmMasterID", "RoundNumber",
            "InspectionDate", "InspectorName", "PmChecklistFile", "PmStatus", "Note"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            nextRSeq,
            roundId,
            pmMasterId,
            roundNum,
            inspectionDate,
            String(author).slice(0, 50),
            String(rd.activeProcess || '').slice(0, 255),
            pmStatus,
            JSON.stringify(rd),
          ]
        );
      }
    }

    // 3. 설계변경 이력(MpsiRevisionHistory) UPSERT (설변 입력/파일/메모/양산시작일 등록 시)
    if (
      revisionCode.startsWith('E') ||
      body.action === 'SAVE_REVISION_MASS_START' ||
      body.action === 'ADD_REVISION_MEMO' ||
      body.action === 'CHANGE_STATE'
    ) {
      const revId = `REV-${baseProjectNo}-${revisionCode}`;
      const existingRev = await query(
        `SELECT * FROM "MpsiRevisionHistory" WHERE "RevisionID" = $1 OR ("ProjectID" = $2 AND "RevisionCode" = $3)`,
        [revId, baseProjectNo, revisionCode]
      );
      const prevRevNote = parseNote(existingRev.rows[0]?.Note);
      const appliedDate = toValidDateOrFallback(
        item.revisionMassStartDate || item.massStartDate || existingRev.rows[0]?.AppliedDate,
        true
      );
      const ecoFile = body.attachedFileName || existingRev.rows[0]?.EcoDocumentFile || null;
      const changeReason =
        body.reason ||
        body.memoContent ||
        existingRev.rows[0]?.ChangeReason ||
        `설계변경(${revisionCode}) 진행`;
      const approvalStatus = String(masterNotePayload.currentState || '설변 중').slice(0, 30);

      const revNotePayload = {
        ...prevRevNote,
        author,
        revisionMassStartDate: item.revisionMassStartDate || prevRevNote.revisionMassStartDate,
        revisionMemos: masterNotePayload.revisionMemos,
        memo: body.memoContent || prevRevNote.memo || changeReason,
      };

      if (existingRev.rows.length > 0) {
        await query(
          `UPDATE "MpsiRevisionHistory"
           SET "ChangeReason" = $1,
               "ApprovalStatus" = $2,
               "AppliedDate" = $3,
               "EcoDocumentFile" = COALESCE($4, "EcoDocumentFile"),
               "Note" = $5
           WHERE "RevisionSequenceNo" = $6`,
          [
            String(changeReason).slice(0, 255),
            approvalStatus,
            appliedDate,
            ecoFile ? String(ecoFile).slice(0, 255) : null,
            JSON.stringify(revNotePayload),
            existingRev.rows[0].RevisionSequenceNo,
          ]
        );
      } else {
        const hSeqRes = await query(`SELECT COALESCE(MAX("RevisionSequenceNo"), 0) + 1 AS next_seq FROM "MpsiRevisionHistory"`);
        const nextHSeq = Number(hSeqRes.rows[0]?.next_seq || 1);
        await query(
          `INSERT INTO "MpsiRevisionHistory" (
            "RevisionSequenceNo", "RevisionID", "ProjectID", "RevisionCode",
            "ChangeReason", "ChangeAmount", "ApprovalStatus", "AppliedDate", "EcoDocumentFile", "Note"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            nextHSeq,
            revId,
            baseProjectNo,
            revisionCode,
            String(changeReason).slice(0, 255),
            0,
            approvalStatus,
            appliedDate,
            ecoFile ? String(ecoFile).slice(0, 255) : null,
            JSON.stringify(revNotePayload),
          ]
        );
      }
    }

    // 4. ProjectMaster 양산 시작일 동기화
    const syncMassStart = toValidDateOrFallback(
      item.revisionMassStartDate || (item.massStartDate !== '공급업체입력' ? item.massStartDate : '') || body.roundData?.schedule?.actualMassStartDate,
      false
    );
    if (syncMassStart) {
      await syncDownstreamToProjectMaster(baseProjectNo, {
        massStartDate: syncMassStart,
      });
    }

    return NextResponse.json({ success: true, data: { projectNo: baseProjectNo, pmMasterId } });
  } catch (error: any) {
    console.error('POST /api/v1/pm-revisions error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
