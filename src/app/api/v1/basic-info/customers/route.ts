// src/app/api/v1/basic-info/customers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const initialCustomersSeed = [
  { custCode: "CUST-015", custName: "퍼스트클래스", bizRegNo: "110-81-2468", ceoName: "송혜교", country: "KR", zipCode: "04323", address1: "서울특별시 용산구", address2: "용산타워 20층", phone: "02-888-6666", fax: "02-888-6667", useYn: "Y", managerName: "박보검", managerEmail: "bg.park@firstclass.co.kr", managerPhone: "010-6666-8888", regDate: "2026-03-01" },
  { custCode: "CUST-014", custName: "(주)넥스트레벨", bizRegNo: "220-81-1357", ceoName: "현빈", country: "KR", zipCode: "06000", address1: "서울특별시 강남구", address2: "넥스트타워", phone: "02-777-5555", fax: "02-777-5556", useYn: "Y", managerName: "손예진", managerEmail: "yj.son@nextlevel.co.kr", managerPhone: "010-5555-7777", regDate: "2026-02-28" },
  { custCode: "CUST-013", custName: "케이씨산업", bizRegNo: "505-81-9090", ceoName: "공유", country: "KR", zipCode: "38111", address1: "경상북도 경주시", address2: "경주공장 사무동", phone: "054-666-4444", fax: "054-666-4445", useYn: "Y", managerName: "김고은", managerEmail: "ge.kim@kcind.co.kr", managerPhone: "010-4444-6666", regDate: "2026-02-20" },
  { custCode: "CUST-012", custName: "에이플러스", bizRegNo: "408-81-7878", ceoName: "남궁민", country: "KR", zipCode: "10408", address1: "경기도 고양시 일산동구", address2: "메트로폴리스 5층", phone: "031-555-3333", fax: "031-555-3334", useYn: "Y", managerName: "정해인", managerEmail: "hi.jung@aplus.kr", managerPhone: "010-3333-5555", regDate: "2026-02-15" },
  { custCode: "CUST-011", custName: "비전기획", bizRegNo: "105-82-5656", ceoName: "권나라", country: "KR", zipCode: "03186", address1: "서울특별시 종로구", address2: "비전빌딩 4층", phone: "02-444-2222", fax: "02-444-2223", useYn: "Y", managerName: "유재석", managerEmail: "js.yoo@vision.co.kr", managerPhone: "010-2222-4444", regDate: "2026-02-10" },
  { custCode: "CUST-010", custName: "(주)아이티월드", bizRegNo: "201-81-3434", ceoName: "한예슬", country: "KR", zipCode: "08501", address1: "서울특별시 금천구", address2: "IT단지 1501호", phone: "02-333-1111", fax: "02-333-1112", useYn: "Y", managerName: "서준호", managerEmail: "jh.seo@itworld.co.kr", managerPhone: "010-1111-3333", regDate: "2026-02-01" },
  { custCode: "CUST-009", custName: "그린에너지", bizRegNo: "603-81-1212", ceoName: "홍길동", country: "KR", zipCode: "44730", address1: "울산광역시 남구", address2: "그린타워 10층", phone: "052-222-9000", fax: "052-222-9009", useYn: "Y", managerName: "백상훈", managerEmail: "sh.baek@greenenergy.com", managerPhone: "010-9999-0000", regDate: "2026-01-25" },
  { custCode: "CUST-008", custName: "대영소프트", bizRegNo: "128-86-9900", ceoName: "송중기", country: "KR", zipCode: "13487", address1: "경기도 성남시 분당구", address2: "판교테크노밸리 B동", phone: "031-777-8000", fax: "031-777-8008", useYn: "Y", managerName: "조상욱", managerEmail: "sw.cho@daeyoung.co.kr", managerPhone: "010-8888-9999", regDate: "2026-01-20" },
  { custCode: "CUST-007", custName: "(주)제이앤비", bizRegNo: "502-81-7788", ceoName: "장서준", country: "KR", zipCode: "61928", address1: "광주광역시 서구", address2: "오피스타워 502호", phone: "062-333-7000", fax: "062-333-7007", useYn: "Y", managerName: "임채원", managerEmail: "cw.lim@jbcorp.co.kr", managerPhone: "010-7777-8888", regDate: "2026-01-15" },
  { custCode: "CUST-006", custName: "스마트로지스", bizRegNo: "113-81-5566", ceoName: "윤도현", country: "KR", zipCode: "21558", address1: "인천광역시 남동구", address2: "물류센터 A동", phone: "032-888-6000", fax: "032-888-6006", useYn: "N", managerName: "김나영", managerEmail: "ny.kim@smartlogis.com", managerPhone: "010-6666-7777", regDate: "2026-01-10" },
  { custCode: "CUST-005", custName: "에코시스템즈", bizRegNo: "410-82-3344", ceoName: "최지우", country: "KR", zipCode: "16501", address1: "경기도 수원시 영통구", address2: "광교비즈니스센터 8층", phone: "031-222-5000", fax: "031-222-5005", useYn: "Y", managerName: "윤미래", managerEmail: "mr.yoon@eco.co.kr", managerPhone: "010-5555-6666", regDate: "2026-01-05" },
  { custCode: "CUST-004", custName: "(주)글로벌트레이드", bizRegNo: "305-81-1122", ceoName: "정민호", country: "KR", zipCode: "34111", address1: "대전광역시 유성구", address2: "창업보육센터 204호", phone: "042-444-4000", fax: "042-444-4004", useYn: "Y", managerName: "강동현", managerEmail: "dh.kang@globaltrade.kr", managerPhone: "010-4444-5555", regDate: "2025-12-28" },
  { custCode: "CUST-003", custName: "한빛물산", bizRegNo: "107-85-9876", ceoName: "박준영", country: "KR", zipCode: "48058", address1: "부산광역시 해운대구", address2: "한빛빌딩 12층", phone: "051-999-3000", fax: "051-999-3003", useYn: "Y", managerName: "최유진", managerEmail: "yj.choi@hanbit.co.kr", managerPhone: "010-3333-4444", regDate: "2025-12-20" },
  { custCode: "CUST-002", custName: "미래네트워크", bizRegNo: "214-86-5432", ceoName: "이영희", country: "KR", zipCode: "04524", address1: "서울특별시 중구", address2: "비즈니스센터 3층", phone: "02-777-2000", fax: "02-777-2002", useYn: "Y", managerName: "박지민", managerEmail: "jm.park@miraenet.co.kr", managerPhone: "010-2222-3333", regDate: "2025-12-15" },
  { custCode: "CUST-001", custName: "(주)테크솔루션", bizRegNo: "120-81-1234", ceoName: "김철수", country: "KR", zipCode: "06159", address1: "서울특별시 강남구", address2: "7층 701호", phone: "02-555-1000", fax: "02-555-1001", useYn: "Y", managerName: "이지혜", managerEmail: "jh.lee@techsol.co.kr", managerPhone: "010-1111-2222", regDate: "2025-12-01" },
];

// DB 행 데이터를 프론트엔드 Customer 모델로 변환
function mapRowToCustomer(row: any, index: number) {
  return {
    id: Number(row.CustomerPartyMasterSequenceNo),
    idx: index + 1,
    custCode: row.CustomerID || '',
    custName: row.CustomerName || '',
    bizRegNo: row.BusinessRegistrationNumber || '',
    ceoName: row.RepresentativeName || '',
    country: row.CountryID || 'KR',
    zipCode: row.PostalCode || '',
    address1: row.BaseAddress || '',
    address2: row.DetailAddress || '',
    phone: row.DialNumber || '',
    fax: row.FaxNumber || '',
    useYn: row.UseIndicator ? 'Y' : 'N',
    managerName: row.PersonInChargeName || '',
    managerEmail: row.PersonInChargeEmail || '',
    managerPhone: row.PersonInChargeDialNumber || '',
    regDate: row.CreationDateTime
      ? new Date(row.CreationDateTime).toISOString().split('T')[0]
      : '',
  };
}

// 1. 고객사 목록 조회 및 자동 시딩
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enterpriseId = process.env.NEXT_PUBLIC_NODE_ID || 'MPSI_HQ';

    // 테이블 행 수 확인 및 초기 시딩
    const countRes = await query(
      'SELECT count(*) as cnt FROM "CustomerPartyMaster" WHERE "EnterpriseID" = $1',
      [enterpriseId]
    );
    const currentCount = Number(countRes.rows[0]?.cnt || 0);

    if (currentCount === 0) {
      for (const item of initialCustomersSeed) {
        await query(
          `INSERT INTO "CustomerPartyMaster" (
            "EnterpriseID", "SiteID", "PlantID", "CustomerID", "CustomerName",
            "BusinessRegistrationNumber", "RepresentativeName", "CountryID",
            "PostalCode", "BaseAddress", "DetailAddress", "DialNumber",
            "FaxNumber", "UseIndicator", "PersonInChargeName", "PersonInChargeEmail",
            "PersonInChargeDialNumber", "CreationDateTime"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT ("EnterpriseID", "CustomerID") DO NOTHING`,
          [
            enterpriseId,
            'SITE_01',
            'PLANT_01',
            item.custCode,
            item.custName,
            item.bizRegNo,
            item.ceoName,
            item.country,
            item.zipCode,
            item.address1,
            item.address2,
            item.phone,
            item.fax,
            item.useYn === 'Y',
            item.managerName,
            item.managerEmail,
            item.managerPhone,
            new Date(item.regDate),
          ]
        );
      }
    }

    // 조건부 검색 쿼리 조립
    let sql = `
      SELECT * FROM "CustomerPartyMaster"
      WHERE "EnterpriseID" = $1
    `;
    const params: any[] = [enterpriseId];
    let paramIdx = 2;

    const custCode = searchParams.get('custCode');
    if (custCode) {
      sql += ` AND LOWER("CustomerID") LIKE $${paramIdx++}`;
      params.push(`%${custCode.toLowerCase()}%`);
    }

    const custName = searchParams.get('custName');
    if (custName) {
      sql += ` AND "CustomerName" ILIKE $${paramIdx++}`;
      params.push(`%${custName}%`);
    }

    const bizRegNo = searchParams.get('bizRegNo');
    if (bizRegNo) {
      sql += ` AND "BusinessRegistrationNumber" LIKE $${paramIdx++}`;
      params.push(`%${bizRegNo}%`);
    }

    const ceoName = searchParams.get('ceoName');
    if (ceoName) {
      sql += ` AND "RepresentativeName" ILIKE $${paramIdx++}`;
      params.push(`%${ceoName}%`);
    }

    const country = searchParams.get('country');
    if (country && country !== 'ALL') {
      sql += ` AND "CountryID" = $${paramIdx++}`;
      params.push(country);
    }

    const useYn = searchParams.get('useYn');
    if (useYn && useYn !== 'ALL') {
      sql += ` AND "UseIndicator" = $${paramIdx++}`;
      params.push(useYn === 'Y');
    }

    const dateFrom = searchParams.get('dateFrom');
    if (dateFrom) {
      sql += ` AND "CreationDateTime" >= $${paramIdx++}`;
      params.push(`${dateFrom} 00:00:00`);
    }

    const dateTo = searchParams.get('dateTo');
    if (dateTo) {
      sql += ` AND "CreationDateTime" <= $${paramIdx++}`;
      params.push(`${dateTo} 23:59:59`);
    }

    sql += ' ORDER BY "CustomerPartyMasterSequenceNo" DESC';

    const result = await query(sql, params);
    const customers = result.rows.map((row, idx) => mapRowToCustomer(row, idx));

    return NextResponse.json({
      success: true,
      totalCount: customers.length,
      data: customers,
    });
  } catch (error: any) {
    console.error('GET /api/v1/basic-info/customers error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 2. 고객사 신규 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const enterpriseId = process.env.NEXT_PUBLIC_NODE_ID || 'MPSI_HQ';

    const insertSql = `
      INSERT INTO "CustomerPartyMaster" (
        "EnterpriseID", "SiteID", "PlantID", "CustomerID", "CustomerName",
        "BusinessRegistrationNumber", "RepresentativeName", "CountryID",
        "PostalCode", "BaseAddress", "DetailAddress", "DialNumber",
        "FaxNumber", "UseIndicator", "PersonInChargeName", "PersonInChargeEmail",
        "PersonInChargeDialNumber", "CreationDateTime"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      RETURNING *
    `;

    const params = [
      enterpriseId,
      body.siteId || 'SITE_01',
      body.plantId || 'PLANT_01',
      body.custCode,
      body.custName,
      body.bizRegNo || '',
      body.ceoName || '',
      body.country || 'KR',
      body.zipCode || '',
      body.address1 || '',
      body.address2 || '',
      body.phone || '',
      body.fax || '',
      body.useYn !== 'N',
      body.managerName || '',
      body.managerEmail || '',
      body.managerPhone || '',
    ];

    const result = await query(insertSql, params);
    const newCustomer = mapRowToCustomer(result.rows[0], 0);

    return NextResponse.json({
      success: true,
      message: '고객사가 정상 등록되었습니다.',
      data: newCustomer,
    });
  } catch (error: any) {
    console.error('POST /api/v1/basic-info/customers error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 3. 고객사 일괄 저장/수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const customers: any[] = Array.isArray(body) ? body : [body];

    for (const cust of customers) {
      if (cust.id) {
        await query(
          `UPDATE "CustomerPartyMaster" SET
            "CustomerID" = $1,
            "CustomerName" = $2,
            "BusinessRegistrationNumber" = $3,
            "RepresentativeName" = $4,
            "CountryID" = $5,
            "PostalCode" = $6,
            "BaseAddress" = $7,
            "DetailAddress" = $8,
            "DialNumber" = $9,
            "FaxNumber" = $10,
            "UseIndicator" = $11,
            "PersonInChargeName" = $12,
            "PersonInChargeEmail" = $13,
            "PersonInChargeDialNumber" = $14,
            "ModificationDateTime" = NOW()
          WHERE "CustomerPartyMasterSequenceNo" = $15`,
          [
            cust.custCode,
            cust.custName,
            cust.bizRegNo,
            cust.ceoName,
            cust.country,
            cust.zipCode,
            cust.address1,
            cust.address2,
            cust.phone,
            cust.fax,
            cust.useYn === 'Y',
            cust.managerName,
            cust.managerEmail,
            cust.managerPhone,
            cust.id,
          ]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: '성공적으로 저장되었습니다.',
    });
  } catch (error: any) {
    console.error('PUT /api/v1/basic-info/customers error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 4. 고객사 선택 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        { success: false, error: '삭제할 대상 ID가 지정되지 않았습니다.' },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',').map((id) => Number(id.trim())).filter(Boolean);

    // 물리 삭제 대신 UseIndicator 플래그를 FALSE로 업데이트
    await query(
      'UPDATE "CustomerPartyMaster" SET "UseIndicator" = FALSE, "ModificationDateTime" = NOW() WHERE "CustomerPartyMasterSequenceNo" = ANY($1::bigint[])',
      [ids]
    );

    return NextResponse.json({
      success: true,
      message: `${ids.length}건의 고객사 상태가 비활성(FALSE) 처리되었습니다.`,
    });
  } catch (error: any) {
    console.error('DELETE /api/v1/basic-info/customers error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

