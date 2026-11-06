// src/app/api/v1/projects/memos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 1. 공정 실무 메모 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectNo = searchParams.get('projectNo');
    const step = searchParams.get('step');

    if (!projectNo) {
      return NextResponse.json({ success: false, error: 'projectNo is required' }, { status: 400 });
    }

    let sql = `
      SELECT 
        "MemoSequenceNo",
        "MemoID",
        "ProjectID",
        "StepNumber",
        "AuthorName",
        "AuthorCompany",
        "Content",
        "CreationDateTime"
      FROM "MpsiProjectStepMemo"
      WHERE "ProjectID" = $1
    `;
    const params: any[] = [projectNo];

    if (step !== null && step !== undefined && step !== '') {
      sql += ` AND "StepNumber" = $2`;
      params.push(parseInt(step, 10));
    }

    sql += ` ORDER BY "MemoSequenceNo" ASC`;

    const res = await query(sql, params);
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    console.error('GET /api/v1/projects/memos error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. 공정 실무 메모 등록 / 수정 (UPSERT)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectNo, step, memo, author, authorCompany } = body;

    if (!projectNo || step === undefined) {
      return NextResponse.json(
        { success: false, error: 'projectNo and step are required' },
        { status: 400 }
      );
    }

    const stepNumber = parseInt(String(step), 10);
    const memoId = body.memoId || `memo-${projectNo}-${stepNumber}`;
    const authorName = author || 'MPSI 관리자';
    const company = authorCompany || 'MPSI';
    const content = memo || '';

    const upsertSql = `
      INSERT INTO "MpsiProjectStepMemo" (
        "MemoID",
        "ProjectID",
        "StepNumber",
        "AuthorName",
        "AuthorCompany",
        "Content",
        "CreationDateTime"
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT ("MemoID") DO UPDATE SET
        "Content" = EXCLUDED."Content",
        "AuthorName" = EXCLUDED."AuthorName",
        "AuthorCompany" = EXCLUDED."AuthorCompany",
        "CreationDateTime" = NOW()
      RETURNING *;
    `;

    const res = await query(upsertSql, [
      memoId,
      projectNo,
      stepNumber,
      authorName,
      company,
      content,
    ]);

    return NextResponse.json({
      success: true,
      message: '공정 실무 메모가 DB에 성공적으로 저장되었습니다.',
      data: res.rows[0],
    });
  } catch (error: any) {
    console.error('POST /api/v1/projects/memos error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

