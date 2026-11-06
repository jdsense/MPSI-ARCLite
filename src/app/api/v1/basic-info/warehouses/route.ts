// src/app/api/v1/basic-info/warehouses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const initialWarehouseMasterSeed = [
  { id: "wh-1", warehouseName: "본사 창고동 (1공장)", location: "광주 본사 1동", description: "MPSI 메인 물류창고" },
  { id: "wh-2", warehouseName: "원재료 보관동 (2공장)", location: "광주 본사 2동", description: "사출 수지 및 레진 전용" },
  { id: "wh-3", warehouseName: "금형/설비 보전실", location: "가공 1공장", description: "금형제작처 금형 및 예비품" },
  { id: "wh-4", warehouseName: "외부 임치 창고 (외주양산)", location: "안산 반월공단", description: "외주사출 양산품 임치" },
];

const initialZonesSeed = [
  {
    warehouseName: "본사 창고동 (1공장)",
    zoneCode: "A구역",
    zoneName: "완제품 주출하 구역",
    assignedUsage: "판매완제품",
    targetCategory: "도어 트림 상단 커버 어셈블리",
    locationDesc: "Rack A-01 ~ A-10",
    temperatureCondition: "상온 (15~25℃)",
    isActive: true,
  },
  {
    warehouseName: "본사 창고동 (1공장)",
    zoneCode: "B구역",
    zoneName: "구매 부품/클립 보관소",
    assignedUsage: "부품",
    targetCategory: "스냅핏 클립, 체결용 볼트",
    locationDesc: "Bin B-01 ~ B-20",
    temperatureCondition: "상온 건조",
    isActive: true,
  },
  {
    warehouseName: "원재료 보관동 (2공장)",
    zoneCode: "E구역",
    zoneName: "수지 원재료 싸이로 및 백보관",
    assignedUsage: "원재료",
    targetCategory: "LG화학 ABS HF-380, PP, PA66",
    locationDesc: "Silo 1~3, Pallet E-01~12",
    temperatureCondition: "항온항습 (습도 40% 이하)",
    isActive: true,
  },
];

export async function GET(request: NextRequest) {
  try {
    const enterpriseId = process.env.NEXT_PUBLIC_NODE_ID || 'MPSI_HQ';

    // 1. 창고 헤더 초기 시딩
    const countRes = await query(
      'SELECT count(*) as cnt FROM "WarehouseLocationHeader" WHERE "EnterpriseID" = $1',
      [enterpriseId]
    );
    const headerCount = Number(countRes.rows[0]?.cnt || 0);

    if (headerCount === 0) {
      for (const wh of initialWarehouseMasterSeed) {
        await query(
          `INSERT INTO "WarehouseLocationHeader" (
            "EnterpriseID", "SiteID", "PlantID", "WarehouseID", "WarehouseName",
            "WarehouseType", "UseIndicator", "Note", "CreationDateTime"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT ("EnterpriseID", "WarehouseID") DO NOTHING`,
          [enterpriseId, 'SITE_01', 'PLANT_01', wh.id, wh.warehouseName, '자재창고', true, wh.description]
        );
      }

      // 라인 시딩
      for (const z of initialZonesSeed) {
        await query(
          `INSERT INTO "WarehouseLocationLine" (
            "EnterpriseID", "SiteID", "PlantID", "WarehouseID", "WarehouseSection",
            "WarehouseSectionName", "Note", "CreationDateTime"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT ("EnterpriseID", "WarehouseID", "WarehouseSection") DO NOTHING`,
          [
            enterpriseId,
            'SITE_01',
            'PLANT_01',
            z.warehouseName === "원재료 보관동 (2공장)" ? "wh-2" : "wh-1",
            z.zoneCode,
            z.zoneName,
            JSON.stringify(z),
          ]
        );
      }
    }

    // 창고 마스터 조회
    const headerRes = await query(
      'SELECT * FROM "WarehouseLocationHeader" WHERE "EnterpriseID" = $1 ORDER BY "WarehouseLocationHeaderSequenceNo"',
      [enterpriseId]
    );
    const warehouses = headerRes.rows.map((row) => ({
      id: row.WarehouseID,
      warehouseName: row.WarehouseName,
      location: row.Note || '본사 사업장',
      description: row.Note,
    }));

    // 창고 라인(구역) 조회
    const lineRes = await query(
      'SELECT * FROM "WarehouseLocationLine" WHERE "EnterpriseID" = $1 ORDER BY "WarehouseLocationLineSequenceNo"',
      [enterpriseId]
    );

    const zones = lineRes.rows.map((row) => {
      let extra: any = {};
      try {
        extra = JSON.parse(row.Note || '{}');
      } catch {
        extra = {};
      }
      return {
        id: Number(row.WarehouseLocationLineSequenceNo),
        warehouseName: extra.warehouseName || '본사 창고동 (1공장)',
        zoneCode: row.WarehouseSection,
        zoneName: row.WarehouseSectionName,
        assignedUsage: extra.assignedUsage || '판매완제품',
        targetCategory: extra.targetCategory || '-',
        locationDesc: extra.locationDesc || 'Rack 구역',
        temperatureCondition: extra.temperatureCondition || '상온',
        isActive: true,
        updatedAt: row.CreationDateTime ? new Date(row.CreationDateTime).toISOString().split('T')[0] : '',
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        warehouses,
        zones,
      },
    });
  } catch (error: any) {
    console.error('GET /api/v1/basic-info/warehouses error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 구역 신규 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const enterpriseId = process.env.NEXT_PUBLIC_NODE_ID || 'MPSI_HQ';

    const noteStr = JSON.stringify(body);

    const insertSql = `
      INSERT INTO "WarehouseLocationLine" (
        "EnterpriseID", "SiteID", "PlantID", "WarehouseID", "WarehouseSection",
        "WarehouseSectionName", "Note", "CreationDateTime"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;

    const params = [
      enterpriseId,
      'SITE_01',
      'PLANT_01',
      body.warehouseId || 'wh-1',
      body.zoneCode,
      body.zoneName,
      noteStr,
    ];

    const res = await query(insertSql, params);
    return NextResponse.json({
      success: true,
      message: '창고 구역이 등록되었습니다.',
      data: res.rows[0],
    });
  } catch (error: any) {
    console.error('POST /api/v1/basic-info/warehouses error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

