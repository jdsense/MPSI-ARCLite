// src/lib/project-master-sync.ts
import { query } from '@/lib/db';

export interface ProjectMasterSyncPayload {
  targetT1Date?: string;
  actualT1Date?: string;
  moldDeliveryDate?: string;
  targetMassDate?: string;
  massStartDate?: string;
  kickoffDate?: string;
  poDate?: string;
  targetMoldDays?: number | string;
  cavity?: string;
  material?: string;
  moldMaterial?: string;
  resinSpec?: string;
  machineTon?: string;
  partWeight?: string | number;
  annualVolume?: string | number;
  warrantyShots?: string | number;
  moldNo?: string;
  moldDegree?: string;
  partNo?: string;
  moldVendor?: string;
  massVendor?: string;
  currentStep?: number;
  stepStatus?: string;
  trialDegree?: string;
}

function isValidDateStr(d?: any): boolean {
  if (!d || typeof d !== 'string' || d.trim() === '') return false;
  const parsed = Date.parse(d.trim());
  return !isNaN(parsed);
}

/**
 * 하위 공정(금형견적, 금형설계, 금형제작, 시사출, 양산견적, 시양산, PPAP)에서
 * 입력/수정된 일정(목표 T1, 금형 출고 납기, 목표 양산승인, 킥오프 등) 및 사양(캐비티, 금형처, 양산처 등)을
 * ProjectMaster 테이블(모든 해당 프로젝트 번호 차수 포함)에 즉시 동기화합니다.
 */
export async function syncDownstreamToProjectMaster(
  projectNo: string,
  payload: ProjectMasterSyncPayload
): Promise<void> {
  if (!projectNo || !projectNo.trim()) return;
  const baseNo = projectNo.trim().split('__')[0];

  try {
    // baseNo 또는 baseNo__E001 등 동일 프로젝트 번호 계열 조회
    const res = await query(
      `SELECT "ProjectMasterSequenceNo", "ProjectID", "CurrentProcessStage", "Note"
       FROM "ProjectMaster"
       WHERE ("ProjectID" = $1 OR "ProjectID" LIKE $2)
         AND ("UseIndicator" IS TRUE OR "UseIndicator" IS NULL)
       ORDER BY "ProjectMasterSequenceNo" DESC`,
      [baseNo, `${baseNo}__%`]
    );

    if (res.rows.length === 0) return;

    // 가장 최신 차수 행(설변이 있으면 최신 E차수, 없으면 N001)만 동기화하여 이전 차수는 이력으로 동결 보존
    const targetRows = [res.rows[0]];
    for (const row of targetRows) {
      let noteObj: any = {};
      try {
        noteObj = row.Note ? (typeof row.Note === 'string' ? JSON.parse(row.Note) : row.Note) : {};
      } catch {
        noteObj = {};
      }

      // clean keys that actually have values
      if (payload.targetT1Date) noteObj.targetT1Date = payload.targetT1Date;
      if (payload.actualT1Date) noteObj.actualT1Date = payload.actualT1Date;
      if (payload.moldDeliveryDate) noteObj.moldDeliveryDate = payload.moldDeliveryDate;
      if (payload.targetMassDate) noteObj.targetMassDate = payload.targetMassDate;
      if (payload.massStartDate) noteObj.massStartDate = payload.massStartDate;
      if (payload.kickoffDate) noteObj.kickoffDate = payload.kickoffDate;
      if (payload.poDate) noteObj.poDate = payload.poDate;
      if (payload.targetMoldDays !== undefined && payload.targetMoldDays !== '') {
        noteObj.targetMoldDays = payload.targetMoldDays;
      }
      if (payload.cavity) noteObj.cavity = payload.cavity;
      if (payload.material) noteObj.material = payload.material;
      if (payload.moldMaterial) noteObj.moldMaterial = payload.moldMaterial;
      if (payload.resinSpec) noteObj.resinSpec = payload.resinSpec;
      if (payload.machineTon) noteObj.machineTon = payload.machineTon;
      if (payload.partWeight !== undefined && payload.partWeight !== '') noteObj.partWeight = payload.partWeight;
      if (payload.annualVolume !== undefined && payload.annualVolume !== '') noteObj.annualVolume = payload.annualVolume;
      if (payload.warrantyShots !== undefined && payload.warrantyShots !== '') noteObj.warrantyShots = payload.warrantyShots;
      if (payload.moldNo) noteObj.moldNo = payload.moldNo;
      if (payload.moldDegree) noteObj.moldDegree = payload.moldDegree;
      if (payload.partNo) noteObj.partNo = payload.partNo;
      if (payload.moldVendor) noteObj.moldVendor = payload.moldVendor;
      if (payload.massVendor) noteObj.massVendor = payload.massVendor;
      if (payload.trialDegree) noteObj.trialDegree = payload.trialDegree;
      if (payload.stepStatus) noteObj.stepStatus = payload.stepStatus;

      const currentStage = Number(row.CurrentProcessStage || noteObj.currentStep || 0);
      const nextStep = payload.currentStep !== undefined
        ? Math.max(currentStage, Number(payload.currentStep))
        : currentStage;
      if (nextStep > 0) {
        noteObj.currentStep = nextStep;
      }

      const expectedStart = isValidDateStr(noteObj.kickoffDate) ? new Date(noteObj.kickoffDate) : null;
      const expectedEnd = isValidDateStr(noteObj.targetMassDate)
        ? new Date(noteObj.targetMassDate)
        : isValidDateStr(noteObj.targetT1Date)
        ? new Date(noteObj.targetT1Date)
        : null;

      await query(
        `UPDATE "ProjectMaster"
         SET "ExpectedStartDate" = COALESCE($1, "ExpectedStartDate"),
             "ExpectedEndDate" = COALESCE($2, "ExpectedEndDate"),
             "CurrentProcessStage" = CASE WHEN $3::INT > 0 THEN $3::VARCHAR ELSE "CurrentProcessStage" END,
             "Note" = $4,
             "ModificationDateTime" = NOW()
         WHERE "ProjectMasterSequenceNo" = $5`,
        [
          expectedStart,
          expectedEnd,
          nextStep,
          JSON.stringify(noteObj),
          row.ProjectMasterSequenceNo,
        ]
      );
    }
  } catch (err) {
    console.warn('[syncDownstreamToProjectMaster Warning]', err);
  }
}
