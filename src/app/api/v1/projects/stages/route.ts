// src/app/api/v1/projects/stages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 1. 공정 단계 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectNo = searchParams.get('projectNo');

    if (!projectNo) {
      return NextResponse.json({ success: false, error: 'projectNo is required' }, { status: 400 });
    }

    const res = await query(
      `SELECT * FROM "MpsiProjectStage" WHERE "ProjectID" = $1 ORDER BY "StepNumber" ASC`,
      [projectNo]
    );

    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    console.error('GET /api/v1/projects/stages error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. 공정 단계 상태/진척률 갱신 (UPSERT)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectNo, step, stepName, stepStatus, completionRate, plannedStartDate, plannedEndDate, actualStartDate, actualEndDate, responsibleOrgType, note } = body;

    if (!projectNo || step === undefined) {
      return NextResponse.json({ success: false, error: 'projectNo and step are required' }, { status: 400 });
    }

    const stepNumber = parseInt(String(step), 10);

    const upsertSql = `
      INSERT INTO "MpsiProjectStage" (
        "ProjectID",
        "StepNumber",
        "StepName",
        "StepStatus",
        "CompletionRate",
        "PlannedStartDate",
        "PlannedEndDate",
        "ActualStartDate",
        "ActualEndDate",
        "ResponsibleOrgType",
        "Note",
        "CreationDateTime",
        "ModificationDateTime"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
      )
      ON CONFLICT ("ProjectID", "StepNumber") DO UPDATE SET
        "StepName" = COALESCE(EXCLUDED."StepName", "MpsiProjectStage"."StepName"),
        "StepStatus" = COALESCE(EXCLUDED."StepStatus", "MpsiProjectStage"."StepStatus"),
        "CompletionRate" = COALESCE(EXCLUDED."CompletionRate", "MpsiProjectStage"."CompletionRate"),
        "PlannedStartDate" = COALESCE(EXCLUDED."PlannedStartDate", "MpsiProjectStage"."PlannedStartDate"),
        "PlannedEndDate" = COALESCE(EXCLUDED."PlannedEndDate", "MpsiProjectStage"."PlannedEndDate"),
        "ActualStartDate" = COALESCE(EXCLUDED."ActualStartDate", "MpsiProjectStage"."ActualStartDate"),
        "ActualEndDate" = COCLUDED."ActualEndDate", "MpsiProjectStage"."ActualEndDate"),
        "ResponsibleOrgType" = COALESCE(EXCLUDED."ResponsibleOrgType", "MpsiProjectStage"."ResponsibleOrgType"),
        "Note" = COALESCE(EXCLUDED."Note", "MpsiProjectStage"."Note"),
        "ModificationDateTime" = NOW()
      RETURNING *;
    `;

    // SQL syntax fix: EXCLUDED."ActualEndDate"
    const fixedUpsertSql = `
      INSERT INTO "MpsiProjectStage" (
        "ProjectID",
        "StepNumber",
        "StepName",
        "StepStatus",
        "CompletionRate",
        "PlannedStartDate",
        "PlannedEndDate",
        "ActualStartDate",
        "ActualEndDate",
        "ResponsibleOrgType",
        "Note",
        "CreationDateTime",
        "ModificationDateTime"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
      )
      ON CONFLICT ("ProjectID", "StepNumber") DO UPDATE SET
        "StepName" = COALESCE(EXCLUDED."StepName", "MpsiProjectStage"."StepName"),
        "StepStatus" = COALESCE(EXCLUDED."StepStatus", "MpsiProjectStage"."StepStatus"),
        "CompletionRate" = COALESCE(EXCLUDED."CompletionRate", "MpsiProjectStage"."CompletionRate"),
        "PlannedStartDate" = COALESCE(EXCLUDED."PlannedStartDate", "MpsiProjectStage"."PlannedStartDate"),
        "PlannedEndDate" = COALESCE(EXCLUDED."PlannedEndDate", "MpsiProjectStage"."PlannedEndDate"),
        "ActualStartDate" = COALESCE(EXCLUDED."ActualStartDate", "MpsiProjectStage"."ActualStartDate"),
        "ActualEndDate" = COALESCE(EXCLUDED."ActualEndDate", "MpsiProjectStage"."ActualEndDate"),
        "ResponsibleOrgType" = COALESCE(EXCLUDED."ResponsibleOrgType", "MpsiProjectStage"."ResponsibleOrgType"),
        "Note" = COALESCE(EXCLUDED."Note", "MpsiProjectStage"."Note"),
        "ModificationDateTime" = NOW()
      RETURNING *;
    `;

    const res = await query(fixedUpsertSql, [
      projectNo,
      stepNumber,
      stepName || null,
      stepStatus || null,
      completionRate !== undefined ? completionRate : null,
      plannedStartDate ? new Date(plannedStartDate) : null,
      plannedEndDate ? new Date(plannedEndDate) : null,
      actualStartDate ? new Date(actualStartDate) : null,
      actualEndDate ? new Date(actualEndDate) : null,
      responsibleOrgType || null,
      note || null,
    ]);

    // ProjectMaster의 현재 step/stepStatus도 필요시 업데이트
    try {
      await query(
        `UPDATE "ProjectMaster"
         SET "ProjectStatusCode" = COALESCE($1, "ProjectStatusCode"),
             "ModificationDateTime" = NOW()
         WHERE "ProjectID" = $2`,
        [stepStatus || null, projectNo]
      );
    } catch {}

    return NextResponse.json({
      success: true,
      message: '공정 단계 상태가 DB에 성공적으로 저장되었습니다.',
      data: res.rows[0],
    });
  } catch (error: any) {
    console.error('PUT /api/v1/projects/stages error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

