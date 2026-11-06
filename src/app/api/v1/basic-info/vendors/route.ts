// src/app/api/v1/basic-info/vendors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const initialVendorsSeed = [
  {
    vendorCode: "C-HK-001",
    companyName: "현대자동차(주) 광주공장",
    bizRegNo: "101-81-09147",
    bizType: "제조업",
    bizItem: "자동차 및 동 부분품",
    ceoName: "정의선, 장재훈",
    country: "대한민국",
    zipCode: "06797",
    baseAddress: "광주광역시 광산구 삼소로 270",
    detailAddress: "의장공장 구매관리부",
    telNo: "062-950-1114",
    faxNo: "062-950-1115",
    email: "purchasing@hyundai.com",
    managerName: "최민희 차장",
    isActive: true,
    updatedAt: "2026-08-18",
  },
  {
    vendorCode: "C-MOBIS-002",
    companyName: "현대모비스(주)",
    bizRegNo: "201-81-22441",
    bizType: "제조업",
    bizItem: "자동차 부품 모듈",
    ceoName: "이규석",
    country: "대한민국",
    zipCode: "06141",
    baseAddress: "서울특별시 강남구 테헤란로 203",
    detailAddress: "모듈사업부",
    telNo: "02-2018-5114",
    faxNo: "02-2018-5000",
    email: "mobis_scm@mobis.co.kr",
    managerName: "박준영 과장",
    isActive: true,
    updatedAt: "2026-08-15",
  },
  {
    vendorCode: "S-WS-001",
    companyName: "우성정공 (금형제작)",
    bizRegNo: "131-86-12345",
    bizType: "제조업",
    bizItem: "정밀 플라스틱 사출금형, CAE 설계",
    ceoName: "박우성",
    country: "대한민국",
    zipCode: "21697",
    baseAddress: "인천광역시 남동구 남동서로 123",
    detailAddress: "남동공단 45블럭 6롯트",
    telNo: "032-815-5678",
    faxNo: "032-815-5679",
    email: "mold_sales@woosung.co.kr",
    managerName: "배희섭 이사 (기술영업)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    vendorCode: "S-NM-002",
    companyName: "뉴몰드 (사출양산)",
    bizRegNo: "134-81-67890",
    bizType: "제조업",
    bizItem: "플라스틱 사출성형, 양산조립",
    ceoName: "김신호",
    country: "대한민국",
    zipCode: "18525",
    baseAddress: "경기도 화성시 향남읍 토성로 88",
    detailAddress: "양산 1공장",
    telNo: "031-352-8801",
    faxNo: "031-352-8802",
    email: "mass_prod@newmold.co.kr",
    managerName: "김영수 부장 (품질보증)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    vendorCode: "S-DH-003",
    companyName: "대한금형(주) (금형제작)",
    bizRegNo: "128-81-99887",
    bizType: "제조업",
    bizItem: "자동차 플라스틱 사출금형, 대형 정밀금형",
    ceoName: "정대한",
    country: "대한민국",
    zipCode: "18284",
    baseAddress: "경기도 화성시 향남읍 발안공단로 45",
    detailAddress: "대한금형 화성공장",
    telNo: "031-352-8800",
    faxNo: "031-352-8801",
    email: "sales@daehanmold.co.kr",
    managerName: "이정우 팀장 (기술영업)",
    isActive: true,
    updatedAt: "2026-08-20",
  },
  {
    vendorCode: "S-KP-004",
    companyName: "(주)한국정밀사출 (사출양산)",
    bizRegNo: "135-86-44332",
    bizType: "제조업",
    bizItem: "정밀 플라스틱 부품 사출, 2중사출, 조립",
    ceoName: "최한국",
    country: "대한민국",
    zipCode: "14562",
    baseAddress: "경기도 부천시 오정구 석천로 345",
    detailAddress: "부천테크노파크 3단지",
    telNo: "032-621-3300",
    faxNo: "032-621-3301",
    email: "hk_precision@koreaplas.com",
    managerName: "강성호 부장 (품질관리)",
    isActive: true,
    updatedAt: "2026-08-16",
  },
];

function mapRowToVendor(row: any) {
  const code = row.VendorID || '';
  const isCust = code.startsWith('C-');
  return {
    id: Number(row.VendorPartyMasterSequenceNo),
    category: isCust ? '고객사' : '공급업체',
    vendorCode: code,
    companyName: row.VendorName || '',
    bizRegNo: row.BusinessRegistrationNumber || '',
    bizType: '제조업',
    bizItem: row.Note || '정밀 제조/가공',
    ceoName: row.RepresentativeName || '',
    country: row.CountryID || '대한민국',
    zipCode: row.PostalCode || '',
    baseAddress: row.BaseAddress || '',
    detailAddress: row.DetailAddress || '',
    telNo: row.DialNumber || '',
    faxNo: row.FaxNumber || '',
    email: row.PersonInChargeEmail || '',
    managerName: row.PersonInChargeName || '',
    isActive: row.UseIndicator !== false,
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

    // 테이블 행 수 확인 및 초기 시딩
    const countRes = await query(
      'SELECT count(*) as cnt FROM "VendorPartyMaster" WHERE "EnterpriseID" = $1',
      [enterpriseId]
    );
    const currentCount = Number(countRes.rows[0]?.cnt || 0);

    if (currentCount === 0) {
      for (const item of initialVendorsSeed) {
        await query(
          `INSERT INTO "VendorPartyMaster" (
            "EnterpriseID", "SiteID", "PlantID", "VendorID", "VendorName",
            "BusinessRegistrationNumber", "RepresentativeName", "CountryID",
            "PostalCode", "BaseAddress", "DetailAddress", "DialNumber",
            "FaxNumber", "UseIndicator", "PersonInChargeName", "PersonInChargeEmail",
            "Note", "CreationDateTime"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT ("EnterpriseID", "VendorID") DO NOTHING`,
          [
            enterpriseId,
            'SITE_01',
            'PLANT_01',
            item.vendorCode,
            item.companyName,
            item.bizRegNo,
            item.ceoName,
            item.country,
            item.zipCode,
            item.baseAddress,
            item.detailAddress,
            item.telNo,
            item.faxNo,
            item.isActive,
            item.managerName,
            item.email,
            item.bizItem,
            new Date(item.updatedAt),
          ]
        );
      }
    }

    let sql = 'SELECT * FROM "VendorPartyMaster" WHERE "EnterpriseID" = $1 AND ("UseIndicator" IS TRUE OR "UseIndicator" IS NULL)';
    const params: any[] = [enterpriseId];
    let paramIdx = 2;

    const category = searchParams.get('category');
    if (category && category !== 'ALL') {
      if (category === '고객사') {
        sql += ` AND "VendorID" LIKE 'C-%'`;
      } else if (category === '공급업체') {
        sql += ` AND "VendorID" NOT LIKE 'C-%'`;
      }
    }

    const companyName = searchParams.get('companyName');
    if (companyName) {
      sql += ` AND "VendorName" ILIKE $${paramIdx}`;
      params.push(`%${companyName}%`);
      paramIdx++;
    }

    const bizRegNo = searchParams.get('bizRegNo');
    if (bizRegNo) {
      sql += ` AND "BusinessRegistrationNumber" LIKE $${paramIdx}`;
      params.push(`%${bizRegNo}%`);
      paramIdx++;
    }

    sql += ' ORDER BY "VendorPartyMasterSequenceNo" DESC';

    const res = await query(sql, params);
    const vendors = res.rows.map(mapRowToVendor);

    return NextResponse.json({
      success: true,
      totalCount: vendors.length,
      data: vendors,
    });
  } catch (error: any) {
    console.error('GET /api/v1/basic-info/vendors error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. 신규 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const enterpriseId = process.env.NEXT_PUBLIC_NODE_ID || 'MPSI_HQ';

    const insertSql = `
      INSERT INTO "VendorPartyMaster" (
        "EnterpriseID", "SiteID", "PlantID", "VendorID", "VendorName",
        "BusinessRegistrationNumber", "RepresentativeName", "CountryID",
        "PostalCode", "BaseAddress", "DetailAddress", "DialNumber",
        "FaxNumber", "UseIndicator", "PersonInChargeName", "PersonInChargeEmail",
        "Note", "CreationDateTime"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      RETURNING *
    `;

    const params = [
      enterpriseId,
      'SITE_01',
      'PLANT_01',
      body.vendorCode,
      body.companyName,
      body.bizRegNo || '',
      body.ceoName || '',
      body.country || '대한민국',
      body.zipCode || '',
      body.baseAddress || '',
      body.detailAddress || '',
      body.telNo || '',
      body.faxNo || '',
      body.isActive !== false,
      body.managerName || '',
      body.email || '',
      body.bizItem || '',
    ];

    const result = await query(insertSql, params);
    const newVendor = mapRowToVendor(result.rows[0]);

    return NextResponse.json({
      success: true,
      message: '업체가 등록되었습니다.',
      data: newVendor,
    });
  } catch (error: any) {
    console.error('POST /api/v1/basic-info/vendors error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updateSql = `
      UPDATE "VendorPartyMaster" SET
        "VendorName" = $1,
        "BusinessRegistrationNumber" = $2,
        "RepresentativeName" = $3,
        "CountryID" = $4,
        "PostalCode" = $5,
        "BaseAddress" = $6,
        "DetailAddress" = $7,
        "DialNumber" = $8,
        "FaxNumber" = $9,
        "UseIndicator" = $10,
        "PersonInChargeName" = $11,
        "PersonInChargeEmail" = $12,
        "Note" = $13,
        "ModificationDateTime" = NOW()
      WHERE "VendorPartyMasterSequenceNo" = $14
      RETURNING *
    `;

    const params = [
      body.companyName,
      body.bizRegNo || '',
      body.ceoName || '',
      body.country || '대한민국',
      body.zipCode || '',
      body.baseAddress || '',
      body.detailAddress || '',
      body.telNo || '',
      body.faxNo || '',
      body.isActive !== false,
      body.managerName || '',
      body.email || '',
      body.bizItem || '',
      body.id,
    ];

    const res = await query(updateSql, params);
    return NextResponse.json({
      success: true,
      message: '업체 정보가 수정되었습니다.',
      data: mapRowToVendor(res.rows[0]),
    });
  } catch (error: any) {
    console.error('PUT /api/v1/basic-info/vendors error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 4. 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 ID가 없습니다.' }, { status: 400 });
    }

    // 물리 삭제 대신 UseIndicator 플래그를 FALSE(비활성)로 업데이트
    await query(
      'UPDATE "VendorPartyMaster" SET "UseIndicator" = FALSE, "ModificationDateTime" = NOW() WHERE "VendorPartyMasterSequenceNo" = $1',
      [Number(id)]
    );

    return NextResponse.json({
      success: true,
      message: '업체 정보가 비활성(FALSE) 처리되었습니다.',
    });
  } catch (error: any) {
    console.error('DELETE /api/v1/basic-info/vendors error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
