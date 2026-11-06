// src/app/api/v1/projects/attachments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 1. 공정 첨부파일 목록 조회 (프로젝트별 또는 단계별)
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
        "AttachmentSequenceNo",
        "AttachmentID",
        "ProjectID",
        "StepNumber",
        "FileName",
        "FileSize",
        "FileUrl",
        "UploaderName",
        "UploadDateTime"
      FROM "MpsiProjectStepAttachment"
      WHERE "ProjectID" = $1
    `;
    const params: any[] = [projectNo];

    if (step !== null && step !== undefined && step !== '') {
      sql += ` AND "StepNumber" = $2`;
      params.push(parseInt(step, 10));
    }

    sql += ` ORDER BY "AttachmentSequenceNo" ASC`;

    const res = await query(sql, params);
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    console.error('GET /api/v1/projects/attachments error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. 공정 첨부파일 등록 (DB MpsiProjectStepAttachment 영구 저장)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectNo, step, name, size, url, uploader } = body;

    if (!projectNo || step === undefined || !name) {
      return NextResponse.json(
        { success: false, error: 'projectNo, step, and name are required' },
        { status: 400 }
      );
    }

    const attachmentId = body.attachmentId || `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const stepNumber = parseInt(String(step), 10);
    const fileSize = size || '1.0 MB';
    const fileUrl = url || '';
    const uploaderName = uploader || 'MPSI 관리자';

    const insertSql = `
      INSERT INTO "MpsiProjectStepAttachment" (
        "AttachmentID",
        "ProjectID",
        "StepNumber",
        "FileName",
        "FileSize",
        "FileUrl",
        "UploaderName",
        "UploadDateTime"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT ("AttachmentID") DO UPDATE SET
        "FileName" = EXCLUDED."FileName",
        "FileSize" = EXCLUDED."FileSize",
        "FileUrl" = EXCLUDED."FileUrl",
        "UploaderName" = EXCLUDED."UploaderName",
        "UploadDateTime" = NOW()
      RETURNING *;
    `;

    const res = await query(insertSql, [
      attachmentId,
      projectNo,
      stepNumber,
      name,
      fileSize,
      fileUrl,
      uploaderName,
    ]);

    return NextResponse.json({
      success: true,
      message: '공정 첨부파일이 DB에 성공적으로 등록되었습니다.',
      data: res.rows[0],
    });
  } catch (error: any) {
    console.error('POST /api/v1/projects/attachments error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. 공정 첨부파일 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');
    const projectNo = searchParams.get('projectNo');
    const step = searchParams.get('step');
    const fileName = searchParams.get('fileName');

    if (attachmentId) {
      await query(`DELETE FROM "MpsiProjectStepAttachment" WHERE "AttachmentID" = $1`, [attachmentId]);
      return NextResponse.json({ success: true, message: '첨부파일이 삭제되었습니다.' });
    }

    if (projectNo && step !== null && fileName) {
      await query(
        `DELETE FROM "MpsiProjectStepAttachment" 
         WHERE "ProjectID" = $1 AND "StepNumber" = $2 AND "FileName" = $3`,
        [projectNo, parseInt(step, 10), fileName]
      );
      return NextResponse.json({ success: true, message: '첨부파일이 삭제되었습니다.' });
    }

    return NextResponse.json(
      { success: false, error: 'attachmentId or (projectNo, step, fileName) is required' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('DELETE /api/v1/projects/attachments error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

