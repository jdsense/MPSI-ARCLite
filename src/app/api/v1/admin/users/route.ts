// src/app/api/v1/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { INITIAL_USER_ACCOUNTS, UserAccountItem } from '@/lib/user-constants';

// MpsiUserAccount 테이블 자동 생성 DDL
const CREATE_USER_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS "MpsiUserAccount" (
    "id" SERIAL PRIMARY KEY,
    "EnterpriseID" VARCHAR(50) NOT NULL DEFAULT 'MPSI_HQ',
    "userId" VARCHAR(50) NOT NULL UNIQUE,
    "userName" VARCHAR(200) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "roleId" VARCHAR(50) NOT NULL,
    "roleName" VARCHAR(100) NOT NULL,
    "vendorCode" VARCHAR(50),
    "vendorName" VARCHAR(200),
    "department" VARCHAR(100),
    "email" VARCHAR(255),
    "tel" VARCHAR(50),
    "isUsed" BOOLEAN DEFAULT TRUE,
    "lastLogin" VARCHAR(50),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);
`;

// 0. 초기 테이블 준비 및 4대 시드 주입
async function ensureTableAndSeed() {
  await query(CREATE_USER_TABLE_SQL);

  const countRes = await query('SELECT count(*) as cnt FROM "MpsiUserAccount"');
  const count = Number(countRes.rows[0]?.cnt || 0);

  if (count === 0) {
    for (const u of INITIAL_USER_ACCOUNTS) {
      await query(
        `INSERT INTO "MpsiUserAccount" (
          "userId", "userName", "passwordHash", "roleId", "roleName",
          "vendorCode", "vendorName", "department", "email", "tel", "isUsed", "lastLogin"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT ("userId") DO NOTHING`,
        [
          u.userId,
          u.userName,
          u.passwordHash,
          u.roleId,
          u.roleName,
          u.vendorCode || "",
          u.vendorName || "",
          u.department || "",
          u.email || "",
          u.tel || "",
          u.isUsed !== false,
          u.lastLogin || "",
        ]
      );

      // KS X 9101 표준 "Personnel" 테이블에도 사원으로 동시 등록
      try {
        await query(
          `INSERT INTO "Personnel" (
            "EnterpriseID", "SiteID", "PlantID", "PersonnelID", "PersonnelName",
            "DepartmentID", "EmploymentStatusType", "PersonInChargeEmail",
            "PersonInChargeDialNumber", "Note", "CreationDateTime"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT ("EnterpriseID", "PersonnelID") DO UPDATE SET
            "PersonnelName" = EXCLUDED."PersonnelName",
            "DepartmentID" = EXCLUDED."DepartmentID",
            "PersonInChargeEmail" = EXCLUDED."PersonInChargeEmail",
            "PersonInChargeDialNumber" = EXCLUDED."PersonInChargeDialNumber",
            "Note" = EXCLUDED."Note"`,
          [
            'MPSI_HQ',
            'SITE_01',
            'PLANT_01',
            u.userId,
            u.userName,
            u.department || u.roleName,
            '정규직',
            u.email || `${u.userId}@mpsi.co.kr`,
            u.tel || '02-555-0100',
            JSON.stringify({
              roleId: u.roleId,
              roleName: u.roleName,
              vendorCode: u.vendorCode,
              vendorName: u.vendorName,
              passwordHash: u.passwordHash,
              isUsed: u.isUsed,
            }),
          ]
        );
      } catch (err) {
        // Personnel 테이블 오류 시 무시
      }
    }
  }
}

// 1. GET: 전체 사용자 계정 목록 조회
export async function GET(request: NextRequest) {
  try {
    await ensureTableAndSeed();

    const res = await query('SELECT * FROM "MpsiUserAccount" ORDER BY "id" ASC');
    const users: UserAccountItem[] = res.rows.map((r) => ({
      id: Number(r.id),
      userId: r.userId,
      userName: r.userName,
      passwordHash: r.passwordHash,
      roleId: r.roleId,
      roleName: r.roleName,
      vendorCode: r.vendorCode || "",
      vendorName: r.vendorName || "",
      department: r.department || "",
      email: r.email || "",
      tel: r.tel || "",
      isUsed: r.isUsed !== false,
      lastLogin: r.lastLogin || "",
    }));

    return NextResponse.json({
      success: true,
      totalCount: users.length,
      data: users,
    });
  } catch (error: any) {
    console.error('GET /api/v1/admin/users error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. POST: 신규 사용자 계정 등록 (MpsiUserAccount + Personnel 동시 저장)
export async function POST(request: NextRequest) {
  try {
    await ensureTableAndSeed();
    const body: UserAccountItem = await request.json();

    if (!body.userId?.trim()) {
      return NextResponse.json({ success: false, error: '로그인 ID가 필요합니다.' }, { status: 400 });
    }

    const insertSql = `
      INSERT INTO "MpsiUserAccount" (
        "userId", "userName", "passwordHash", "roleId", "roleName",
        "vendorCode", "vendorName", "department", "email", "tel", "isUsed", "lastLogin", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT ("userId") DO UPDATE SET
        "userName" = EXCLUDED."userName",
        "passwordHash" = EXCLUDED."passwordHash",
        "roleId" = EXCLUDED."roleId",
        "roleName" = EXCLUDED."roleName",
        "vendorCode" = EXCLUDED."vendorCode",
        "vendorName" = EXCLUDED."vendorName",
        "department" = EXCLUDED."department",
        "email" = EXCLUDED."email",
        "tel" = EXCLUDED."tel",
        "isUsed" = EXCLUDED."isUsed",
        "updatedAt" = NOW()
      RETURNING *
    `;

    const params = [
      body.userId.trim(),
      body.userName.trim(),
      body.passwordHash,
      body.roleId,
      body.roleName,
      body.vendorCode || "",
      body.vendorName || "",
      body.department || "",
      body.email || "",
      body.tel || "",
      body.isUsed !== false,
      body.lastLogin || "접속 이력 없음",
    ];

    const res = await query(insertSql, params);
    const saved = res.rows[0];

    // KS X 9101 표준 "Personnel" 테이블에도 사원으로 동시 등록
    try {
      await query(
        `INSERT INTO "Personnel" (
          "EnterpriseID", "SiteID", "PlantID", "PersonnelID", "PersonnelName",
          "DepartmentID", "EmploymentStatusType", "PersonInChargeEmail",
          "PersonInChargeDialNumber", "Note", "CreationDateTime", "ModificationDateTime"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT ("EnterpriseID", "PersonnelID") DO UPDATE SET
          "PersonnelName" = EXCLUDED."PersonnelName",
          "DepartmentID" = EXCLUDED."DepartmentID",
          "PersonInChargeEmail" = EXCLUDED."PersonInChargeEmail",
          "PersonInChargeDialNumber" = EXCLUDED."PersonInChargeDialNumber",
          "Note" = EXCLUDED."Note",
          "ModificationDateTime" = NOW()`,
        [
          'MPSI_HQ',
          'SITE_01',
          'PLANT_01',
          body.userId.trim(),
          body.userName.trim(),
          body.department || body.roleName,
          '정규직',
          body.email || `${body.userId.trim()}@mpsi.co.kr`,
          body.tel || '02-555-0100',
          JSON.stringify({
            roleId: body.roleId,
            roleName: body.roleName,
            vendorCode: body.vendorCode,
            vendorName: body.vendorName,
            passwordHash: body.passwordHash,
            isUsed: body.isUsed,
          }),
        ]
      );
    } catch (err) {
      console.warn('Personnel table sync notice:', err);
    }

    return NextResponse.json({
      success: true,
      message: `계정 [${body.userId}]이 데이터베이스(MpsiUserAccount, Personnel)에 성공적으로 저장되었습니다.`,
      data: {
        id: Number(saved.id),
        userId: saved.userId,
        userName: saved.userName,
        passwordHash: saved.passwordHash,
        roleId: saved.roleId,
        roleName: saved.roleName,
        vendorCode: saved.vendorCode,
        vendorName: saved.vendorName,
        department: saved.department,
        email: saved.email,
        tel: saved.tel,
        isUsed: saved.isUsed,
        lastLogin: saved.lastLogin,
      },
    });
  } catch (error: any) {
    console.error('POST /api/v1/admin/users error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. PUT: 사용자 계정 수정 (암호화 비밀번호, 권한, 협력사코드 등 갱신)
export async function PUT(request: NextRequest) {
  try {
    const body: UserAccountItem = await request.json();

    if (!body.userId?.trim()) {
      return NextResponse.json({ success: false, error: '수정할 userId가 필요합니다.' }, { status: 400 });
    }

    const updateSql = `
      UPDATE "MpsiUserAccount" SET
        "userName" = COALESCE($1, "userName"),
        "passwordHash" = COALESCE($2, "passwordHash"),
        "roleId" = COALESCE($3, "roleId"),
        "roleName" = COALESCE($4, "roleName"),
        "vendorCode" = COALESCE($5, "vendorCode"),
        "vendorName" = COALESCE($6, "vendorName"),
        "department" = COALESCE($7, "department"),
        "email" = COALESCE($8, "email"),
        "tel" = COALESCE($9, "tel"),
        "isUsed" = COALESCE($10, "isUsed"),
        "updatedAt" = NOW()
      WHERE "userId" = $11
      RETURNING *
    `;

    const params = [
      body.userName || null,
      body.passwordHash || null,
      body.roleId || null,
      body.roleName || null,
      body.vendorCode !== undefined ? body.vendorCode : null,
      body.vendorName || null,
      body.department || null,
      body.email || null,
      body.tel || null,
      body.isUsed !== undefined ? body.isUsed : null,
      body.userId.trim(),
    ];

    const res = await query(updateSql, params);

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: '해당 계정을 DB에서 찾을 수 없습니다.' }, { status: 404 });
    }

    const updated = res.rows[0];

    // KS X 9101 표준 "Personnel" 테이블 동기화
    try {
      await query(
        `UPDATE "Personnel" SET
          "PersonnelName" = COALESCE($1, "PersonnelName"),
          "DepartmentID" = COALESCE($2, "DepartmentID"),
          "PersonInChargeEmail" = COALESCE($3, "PersonInChargeEmail"),
          "PersonInChargeDialNumber" = COALESCE($4, "PersonInChargeDialNumber"),
          "Note" = $5,
          "ModificationDateTime" = NOW()
        WHERE "EnterpriseID" = $6 AND "PersonnelID" = $7`,
        [
          body.userName || null,
          body.department || null,
          body.email || null,
          body.tel || null,
          JSON.stringify({
            roleId: body.roleId,
            roleName: body.roleName,
            vendorCode: body.vendorCode,
            vendorName: body.vendorName,
            passwordHash: body.passwordHash,
            isUsed: body.isUsed,
          }),
          'MPSI_HQ',
          body.userId.trim(),
        ]
      );
    } catch (err) {
      console.warn('Personnel table update notice:', err);
    }

    return NextResponse.json({
      success: true,
      message: `계정 [${body.userId}] 정보가 데이터베이스(MpsiUserAccount, Personnel)에 성공적으로 갱신되었습니다.`,
      data: {
        id: Number(updated.id),
        userId: updated.userId,
        userName: updated.userName,
        passwordHash: updated.passwordHash,
        roleId: updated.roleId,
        roleName: updated.roleName,
        vendorCode: updated.vendorCode,
        vendorName: updated.vendorName,
        department: updated.department,
        email: updated.email,
        tel: updated.tel,
        isUsed: updated.isUsed,
        lastLogin: updated.lastLogin,
      },
    });
  } catch (error: any) {
    console.error('PUT /api/v1/admin/users error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 4. DELETE: 사용자 계정 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: '삭제할 userId가 지정되지 않았습니다.' }, { status: 400 });
    }

    if (userId.toLowerCase() === 'admin') {
      return NextResponse.json({ success: false, error: '최고관리자(admin) 계정은 삭제할 수 없습니다.' }, { status: 403 });
    }

    await query('DELETE FROM "MpsiUserAccount" WHERE "userId" = $1', [userId]);

    // Personnel 테이블에서도 퇴사 처리 또는 삭제
    try {
      await query('UPDATE "Personnel" SET "EmploymentStatusType" = \'퇴사\', "ModificationDateTime" = NOW() WHERE "EnterpriseID" = $1 AND "PersonnelID" = $2', [
        'MPSI_HQ',
        userId,
      ]);
    } catch (err) {
      // ignore
    }

    return NextResponse.json({
      success: true,
      message: `계정 [${userId}]이 데이터베이스에서 성공적으로 삭제되었습니다.`,
    });
  } catch (error: any) {
    console.error('DELETE /api/v1/admin/users error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

