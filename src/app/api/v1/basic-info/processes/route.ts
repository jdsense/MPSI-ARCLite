// src/app/api/v1/basic-info/processes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const initialProcessesSeed = [
  {
    processCode: "0",
    processName: "수주",
    section: "0~2 (수주/계획/발주)",
    actorRole: "생산관리 / 영업",
    methodTool: "확정 PO 접수 / MES ERP",
    workPlace: "사무실",
    inputData: "고객사 확정 발주서 (PO)",
    outputData: "수주 등록 및 생산계획 수립",
    leadTimeHours: 2,
    applicableCompany: "MPSI (자사)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    processCode: "10",
    processName: "원자재 입고",
    section: "10~21 (자재입고/수입검사)",
    actorRole: "자재창고 / 물류",
    methodTool: "지게차, 바코드 스캐너",
    workPlace: "E구역 원자재창고",
    inputData: "원재료 거래명세서, COA 성적서",
    outputData: "입고전표, 가입고 등록",
    leadTimeHours: 1,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-18",
  },
  {
    processCode: "20",
    processName: "수입검사 (IQC)",
    section: "10~21 (자재입고/수입검사)",
    actorRole: "품질관리팀 (IQC)",
    methodTool: "MI 측정기, 수분측정기",
    workPlace: "IQC 수입검사실",
    inputData: "수입검사 기준서, 원료 샘플",
    outputData: "IQC 합격증, 본입고 승인",
    leadTimeHours: 4,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-18",
  },
  {
    processCode: "50",
    processName: "금형 장착 및 세팅",
    section: "50~62 (사출성형/설비보전)",
    actorRole: "사출 생산팀 / 보전",
    methodTool: "크레인, 유압체결기, 온조기",
    workPlace: "사출성형 1공장",
    inputData: "금형세팅 기준서, 사출조건표",
    outputData: "초도품 사출 준비 완료",
    leadTimeHours: 2,
    applicableCompany: "뉴몰드 (사출)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    processCode: "GUN",
    processName: "건드릴 딥홀 가공 (Gun Drill)",
    section: "우성 금형가공(GUN/CNC/ML)",
    actorRole: "금형가공팀",
    methodTool: "CNC 건드릴 가공기",
    workPlace: "우성정공 가공 1공장",
    inputData: "금형 냉각홀 3D CAD 모델",
    outputData: "냉각라인 관통 및 수압검사",
    leadTimeHours: 12,
    applicableCompany: "우성정공 (금형)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
];

function mapRowToProcess(row: any) {
  let noteObj: any = {};
  try {
    noteObj = row.Note ? JSON.parse(row.Note) : {};
  } catch {
    noteObj = {};
  }

  return {
    id: Number(row.OperationSequenceNo),
    processCode: row.OperationID || '',
    processName: row.OperationName || '',
    section: row.OperationLargeClass || '0~2 (수주/계획/발주)',
    actorRole: noteObj.actorRole || '생산관리',
    methodTool: noteObj.methodTool || '-',
    workPlace: noteObj.workPlace || '사무실',
    inputData: noteObj.inputData || '-',
    outputData: noteObj.outputData || '-',
    leadTimeHours: noteObj.leadTimeHours || 1,
    applicableCompany: noteObj.applicableCompany || '공통',
    isActive: row.UseIndicator !== false,
    updatedAt: row.CreationDateTime ? new Date(row.CreationDateTime).toISOString().split('T')[0] : '',
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enterpriseId = process.env.NEXT_PUBLIC_NODE_ID || 'MPSI_HQ';

    const countRes = await query(
      'SELECT count(*) as cnt FROM "Operation" WHERE "EnterpriseID" = $1',
      [enterpriseId]
    );
    const currentCount = Number(countRes.rows[0]?.cnt || 0);

    if (currentCount === 0) {
      for (const item of initialProcessesSeed) {
        const noteStr = JSON.stringify({
          actorRole: item.actorRole,
          methodTool: item.methodTool,
          workPlace: item.workPlace,
          inputData: item.inputData,
          outputData: item.outputData,
          leadTimeHours: item.leadTimeHours,
          applicableCompany: item.applicableCompany,
        });

        await query(
          `INSERT INTO "Operation" (
            "EnterpriseID", "SiteID", "PlantID", "OperationID", "OperationName",
            "OperationType", "OperationLargeClass", "UseIndicator", "Note", "CreationDateTime"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT ("EnterpriseID", "OperationID") DO NOTHING`,
          [
            enterpriseId,
            'SITE_01',
            'PLANT_01',
            item.processCode,
            item.processName,
            '생산공정',
            item.section,
            item.isActive,
            noteStr,
          ]
        );
      }
    }

    let sql = 'SELECT * FROM "Operation" WHERE "EnterpriseID" = $1';
    const params: any[] = [enterpriseId];
    let paramIdx = 2;

    const name = searchParams.get('name');
    if (name) {
      sql += ` AND ("OperationName" ILIKE $${paramIdx} OR "OperationID" ILIKE $${paramIdx})`;
      params.push(`%${name}%`);
      paramIdx++;
    }

    const section = searchParams.get('section');
    if (section && section !== 'ALL') {
      sql += ` AND "OperationLargeClass" = $${paramIdx}`;
      params.push(section);
      paramIdx++;
    }

    sql += ' ORDER BY "OperationSequenceNo" ASC';

    const res = await query(sql, params);
    const processes = res.rows.map(mapRowToProcess);

    return NextResponse.json({
      success: true,
      totalCount: processes.length,
      data: processes,
    });
  } catch (error: any) {
    console.error('GET /api/v1/basic-info/processes error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

