// src/app/api/v1/basic-info/employees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const initialEmployeesSeed = [
  {
    category: "자사",
    companyName: "MPSI (원청)",
    empCode: "EMP-2026-001",
    name: "김태훈",
    deptName: "개발기획팀",
    taskRole: "금형/사출 개발 총괄 및 DR 검토",
    relatedPjt: "NT5-2026-A, A2XT-M01",
    employmentType: "정규직",
    email: "thkim@mpsi.co.kr",
    officeTel: "062-951-1234",
    mobilePhone: "010-3344-5566",
    systemRole: "ADMIN",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    category: "자사",
    companyName: "MPSI (원청)",
    empCode: "EMP-2026-002",
    name: "이수진",
    deptName: "품질보증팀",
    taskRole: "PPAP 18대 문서 승인 및 시사출 입회",
    relatedPjt: "NT5-2026-A",
    employmentType: "정규직",
    email: "sjlee@mpsi.co.kr",
    officeTel: "062-951-1235",
    mobilePhone: "010-4455-6677",
    systemRole: "MANAGER",
    isActive: true,
    updatedAt: "2026-08-18",
  },
  {
    category: "공급업체",
    companyName: "우성정공 (금형)",
    empCode: "EMP-WS-001",
    name: "배희섭",
    deptName: "기술영업부",
    taskRole: "금형 견적 제출 및 공정일정 협의",
    relatedPjt: "NT5-2026-A",
    employmentType: "정규직",
    email: "hsbae@woosung.co.kr",
    officeTel: "032-815-5678",
    mobilePhone: "010-9988-7766",
    systemRole: "OPERATOR",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    category: "공급업체",
    companyName: "뉴몰드 (사출)",
    empCode: "EMP-NM-001",
    name: "김부곤",
    deptName: "생산기술부",
    taskRole: "사출 성형조건표 관리 및 Cpk 검증",
    relatedPjt: "NT5-2026-A",
    employmentType: "정규직",
    email: "bgkim@newmold.co.kr",
    officeTel: "031-498-7890",
    mobilePhone: "010-8877-6655",
    systemRole: "OPERATOR",
    isActive: true,
    updatedAt: "2026-08-19",
  },
];

function mapRowToEmployee(row: any) {
  let noteObj: any = {};
  try {
    noteObj = row.Note ? JSON.parse(row.Note) : {};
  } catch {
    noteObj = {};
  }

  return {
    id: Number(row.PersonnelSequenceNo),
    category: noteObj.category || '자사',
    companyName: noteObj.companyName || 'MPSI (원청)',
    empCode: row.PersonnelID || '',
    name: row.PersonnelName || '',
    deptName: row.DepartmentID || '개발기획팀',
    taskRole: noteObj.taskRole || '제조 협업',
    relatedPjt: noteObj.relatedPjt || '-',
    employmentType: row.EmploymentStatusType || '정규직',
    email: row.PersonInChargeEmail || '',
    officeTel: noteObj.officeTel || '',
    mobilePhone: row.PersonInChargeDialNumber || '',
    systemRole: noteObj.systemRole || 'OPERATOR',
    isActive: noteObj.isActive !== false,
    updatedAt: row.ModificationDateTime
      ? new Date(row.ModificationDateTime).toISOString().split('T')[0]
      : row.CreationDateTime
      ? new Date(row.CreationDateTime).toISOString().split('T')[0]
      : '',
  };
}

// 1. 목록 조회 및 자동 시딩
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enterpriseId = process.env.NEXT_PUBLIC_NODE_ID || 'MPSI_HQ';

    const countRes = await query(
      'SELECT count(*) as cnt FROM "Personnel" WHERE "EnterpriseID" = $1',
      [enterpriseId]
    );
    const currentCount = Number(countRes.rows[0]?.cnt || 0);

    if (currentCount === 0) {
      for (const item of initialEmployeesSeed) {
        const noteStr = JSON.stringify({
          category: item.category,
          companyName: item.companyName,
          taskRole: item.taskRole,
          relatedPjt: item.relatedPjt,
          officeTel: item.officeTel,
          systemRole: item.systemRole,
          isActive: item.isActive,
        });

        await query(
          `INSERT INTO "Personnel" (
            "EnterpriseID", "SiteID", "PlantID", "PersonnelID", "PersonnelName",
            "DepartmentID", "EmploymentStatusType", "PersonInChargeEmail",
            "PersonInChargeDialNumber", "Note", "CreationDateTime"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT ("EnterpriseID", "PersonnelID") DO NOTHING`,
          [
            enterpriseId,
            'SITE_01',
            'PLANT_01',
            item.empCode,
            item.name,
            item.deptName,
            item.employmentType,
            item.email,
            item.mobilePhone,
            noteStr,
            new Date(item.updatedAt),
          ]
        );
      }
    }

    let sql = 'SELECT * FROM "Personnel" WHERE "EnterpriseID" = $1 AND ("EmploymentStatusType" != \'퇴사\' OR "EmploymentStatusType" IS NULL)';
    const params: any[] = [enterpriseId];
    let paramIdx = 2;

    const name = searchParams.get('name');
    if (name) {
      sql += ` AND ("PersonnelName" ILIKE $${paramIdx} OR "PersonnelID" ILIKE $${paramIdx})`;
      params.push(`%${name}%`);
      paramIdx++;
    }

    const dept = searchParams.get('dept');
    if (dept && dept !== 'ALL') {
      sql += ` AND "DepartmentID" = $${paramIdx}`;
      params.push(dept);
      paramIdx++;
    }

    sql += ' ORDER BY "PersonnelSequenceNo" DESC';

    const res = await query(sql, params);
    const employees = res.rows.map(mapRowToEmployee);

    return NextResponse.json({
      success: true,
      totalCount: employees.length,
      data: employees,
    });
  } catch (error: any) {
    console.error('GET /api/v1/basic-info/employees error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. 신규 사원 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const enterpriseId = process.env.NEXT_PUBLIC_NODE_ID || 'MPSI_HQ';

    const noteStr = JSON.stringify({
      category: body.category || '자사',
      companyName: body.companyName || 'MPSI (원청)',
      taskRole: body.taskRole || '',
      relatedPjt: body.relatedPjt || '',
      officeTel: body.officeTel || '',
      systemRole: body.systemRole || 'OPERATOR',
      isActive: body.isActive !== false,
    });

    const insertSql = `
      INSERT INTO "Personnel" (
        "EnterpriseID", "SiteID", "PlantID", "PersonnelID", "PersonnelName",
        "DepartmentID", "EmploymentStatusType", "PersonInChargeEmail",
        "PersonInChargeDialNumber", "Note", "CreationDateTime"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `;

    const params = [
      enterpriseId,
      'SITE_01',
      'PLANT_01',
      body.empCode,
      body.name,
      body.deptName || '',
      body.employmentType || '정규직',
      body.email || '',
      body.mobilePhone || '',
      noteStr,
    ];

    const res = await query(insertSql, params);
    return NextResponse.json({
      success: true,
      message: '사원 정보가 등록되었습니다.',
      data: mapRowToEmployee(res.rows[0]),
    });
  } catch (error: any) {
    console.error('POST /api/v1/basic-info/employees error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. 사원 정보 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const noteStr = JSON.stringify({
      category: body.category || '자사',
      companyName: body.companyName || '',
      taskRole: body.taskRole || '',
      relatedPjt: body.relatedPjt || '',
      officeTel: body.officeTel || '',
      systemRole: body.systemRole || 'OPERATOR',
      isActive: body.isActive !== false,
    });

    const updateSql = `
      UPDATE "Personnel" SET
        "PersonnelName" = $1,
        "DepartmentID" = $2,
        "EmploymentStatusType" = $3,
        "PersonInChargeEmail" = $4,
        "PersonInChargeDialNumber" = $5,
        "Note" = $6,
        "ModificationDateTime" = NOW()
      WHERE "PersonnelSequenceNo" = $7
      RETURNING *
    `;

    const params = [
      body.name,
      body.deptName,
      body.employmentType,
      body.email,
      body.mobilePhone,
      noteStr,
      body.id,
    ];

    const res = await query(updateSql, params);
    return NextResponse.json({
      success: true,
      message: '사원 정보가 수정되었습니다.',
      data: mapRowToEmployee(res.rows[0]),
    });
  } catch (error: any) {
    console.error('PUT /api/v1/basic-info/employees error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 4. 사원 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 ID가 없습니다.' }, { status: 400 });
    }

    // 물리 삭제 대신 재직유형을 '퇴사'로 변경 (Soft Delete)
    await query(
      `UPDATE "Personnel" 
       SET "EmploymentStatusType" = '퇴사', "ModificationDateTime" = NOW() 
       WHERE "PersonnelSequenceNo" = $1`,
      [Number(id)]
    );

    return NextResponse.json({
      success: true,
      message: '사원 정보가 퇴사(비활성) 처리되었습니다.',
    });
  } catch (error: any) {
    console.error('DELETE /api/v1/basic-info/employees error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

