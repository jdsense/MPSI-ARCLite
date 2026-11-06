// src/app/api/v1/basic-info/items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const initialItemsSeed = [
  {
    itemCode: "37510-SPX00-BM",
    category: "판매반제품",
    itemName: "BMS Battery Case Module",
    spec: "SKD61 / PBT-GF30 난연, 1*4 Cavity",
    unit: "EA",
    unitPrice: 24500,
    isPriceFixed: true,
    drawingNo: "DWG-SPX-BM375-01",
    inboundWarehouse: "D구역 (판매반제품)",
    outboundWarehouse: "D구역 (판매반제품)",
    requireIqc: false,
    requireOqc: true,
    usageDesc: "SPX 전기차 배터리 모듈 하우징 반제품",
    updatedAt: "2026-10-31",
  },
  {
    itemCode: "82710-AA000",
    category: "판매반제품",
    itemName: "Door Armrest Base",
    spec: "PP 컴파운드 사출물, 1*2 Cavity",
    unit: "EA",
    unitPrice: 11200,
    isPriceFixed: true,
    drawingNo: "DWG-CN7-ARM-8271",
    inboundWarehouse: "D구역 (판매반제품)",
    outboundWarehouse: "D구역 (판매반제품)",
    requireIqc: false,
    requireOqc: true,
    usageDesc: "아반떼 CN7 도어 암레스트 베이스 성형품",
    updatedAt: "2026-10-31",
  },
  {
    itemCode: "84710-NT500-LH",
    category: "판매반제품",
    itemName: "Front Door Upper Cover LH/RH",
    spec: "NAK80 / PP-EPDM, 1*2 Cavity (LH/RH)",
    unit: "EA",
    unitPrice: 18500,
    isPriceFixed: true,
    drawingNo: "DWG-NT5-FDUC-8471",
    inboundWarehouse: "D구역 (판매반제품)",
    outboundWarehouse: "D구역 (판매반제품)",
    requireIqc: false,
    requireOqc: true,
    usageDesc: "현대 NT5 도어 트림 상단 커버 1차 사출품",
    updatedAt: "2026-10-31",
  },
  {
    itemCode: "84740-A2XT0-MB",
    category: "판매반제품",
    itemName: "Center Console Main Bracket",
    spec: "SKD61 / ABS HI-121, 1*1 Cavity",
    unit: "EA",
    unitPrice: 15400,
    isPriceFixed: true,
    drawingNo: "DWG-A2XT-MB-8474",
    inboundWarehouse: "D구역 (판매반제품)",
    outboundWarehouse: "D구역 (판매반제품)",
    requireIqc: false,
    requireOqc: true,
    usageDesc: "기아 A2XT 센터 콘솔 메인 브라켓",
    updatedAt: "2026-10-31",
  },
  {
    itemCode: "86350-K7000",
    category: "판매반제품",
    itemName: "Radiator Lower Grille",
    spec: "KP4M / PC+ABS, 1*1 Cavity",
    unit: "EA",
    unitPrice: 22000,
    isPriceFixed: true,
    drawingNo: "DWG-K7-RLG-8635",
    inboundWarehouse: "D구역 (판매반제품)",
    outboundWarehouse: "D구역 (판매반제품)",
    requireIqc: false,
    requireOqc: true,
    usageDesc: "기아 K7 라디에이터 그릴 로어 사출물",
    updatedAt: "2026-10-31",
  },
];

function mapRowToItem(row: any) {
  return {
    id: Number(row.ItemMasterSequenceNo),
    itemCode: row.ItemID || '',
    category: row.ItemLargeClass || '판매완제품',
    itemName: row.ItemName || '',
    spec: row.ItemSpecification || '',
    unit: row.ItemUOMCode || 'EA',
    unitPrice: Number(row.SafetyStock || 0),
    isPriceFixed: true,
    drawingNo: row.DrawingNumber || '',
    inboundWarehouse: row.ReceiptWarehouseID || '',
    outboundWarehouse: row.IssueWarehouseID || '',
    requireIqc: row.LotControlIndicator || false,
    requireOqc: row.UseIndicator !== false,
    usageDesc: row.Note || '',
    updatedAt: row.ModificationDateTime
      ? new Date(row.ModificationDateTime).toISOString().split('T')[0]
      : row.CreationDateTime
      ? new Date(row.CreationDateTime).toISOString().split('T')[0]
      : '',
  };
}

// 1. 품목 목록 조회 및 자동 시딩
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enterpriseId = process.env.NEXT_PUBLIC_NODE_ID || 'MPSI_HQ';

    // 5대 표준 품목이 존재하는지 확인 (없거나 seed=true 시 보충 주입)
    const checkTargetItem = await query(
      'SELECT count(*) as cnt FROM "ItemMaster" WHERE "EnterpriseID" = $1 AND "ItemID" = $2',
      [enterpriseId, '37510-SPX00-BM']
    );
    const hasTarget = Number(checkTargetItem.rows[0]?.cnt || 0) > 0;

    if (!hasTarget || searchParams.get('seed') === 'true') {
      for (const item of initialItemsSeed) {
        await query(
          `INSERT INTO "ItemMaster" (
            "EnterpriseID", "SiteID", "PlantID", "ItemID", "ItemName",
            "ItemLargeClass", "ItemSpecification", "ItemUOMCode", "DrawingNumber",
            "ReceiptWarehouseID", "IssueWarehouseID", "LotControlIndicator",
            "UseIndicator", "Note", "SafetyStock", "CreationDateTime"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT ("EnterpriseID", "ItemID") DO UPDATE SET
            "UseIndicator" = TRUE`,
          [
            enterpriseId,
            'SITE_01',
            'PLANT_01',
            item.itemCode,
            item.itemName,
            item.category,
            item.spec,
            item.unit,
            item.drawingNo,
            item.inboundWarehouse,
            item.outboundWarehouse,
            item.requireIqc,
            true,
            item.usageDesc,
            item.unitPrice,
            new Date(item.updatedAt),
          ]
        );
      }
    }

    let sql = 'SELECT * FROM "ItemMaster" WHERE "EnterpriseID" = $1 AND ("UseIndicator" IS TRUE OR "UseIndicator" IS NULL)';
    const params: any[] = [enterpriseId];
    let paramIdx = 2;

    const keyword = searchParams.get('keyword');
    if (keyword) {
      sql += ` AND ("ItemName" ILIKE $${paramIdx} OR "ItemID" ILIKE $${paramIdx} OR "DrawingNumber" ILIKE $${paramIdx})`;
      params.push(`%${keyword}%`);
      paramIdx++;
    }

    const category = searchParams.get('category');
    if (category && category !== 'ALL') {
      sql += ` AND "ItemLargeClass" = $${paramIdx}`;
      params.push(category);
      paramIdx++;
    }

    sql += ' ORDER BY "ItemID" ASC';

    const res = await query(sql, params);
    const items = res.rows.map(mapRowToItem);

    return NextResponse.json({
      success: true,
      totalCount: items.length,
      data: items,
    });
  } catch (error: any) {
    console.error('GET /api/v1/basic-info/items error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. 신규 품목 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const enterpriseId = process.env.NEXT_PUBLIC_NODE_ID || 'MPSI_HQ';

    const insertSql = `
      INSERT INTO "ItemMaster" (
        "EnterpriseID", "SiteID", "PlantID", "ItemID", "ItemName",
        "ItemLargeClass", "ItemSpecification", "ItemUOMCode", "DrawingNumber",
        "ReceiptWarehouseID", "IssueWarehouseID", "LotControlIndicator",
        "UseIndicator", "Note", "SafetyStock", "CreationDateTime"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING *
    `;

    const params = [
      enterpriseId,
      'SITE_01',
      'PLANT_01',
      body.itemCode,
      body.itemName,
      body.category || '판매완제품',
      body.spec || '',
      body.unit || 'EA',
      body.drawingNo || '',
      body.inboundWarehouse || '',
      body.outboundWarehouse || '',
      body.requireIqc || false,
      true,
      body.usageDesc || '',
      body.unitPrice || 0,
    ];

    const res = await query(insertSql, params);
    const newItem = mapRowToItem(res.rows[0]);

    return NextResponse.json({
      success: true,
      message: '품목이 등록되었습니다.',
      data: newItem,
    });
  } catch (error: any) {
    console.error('POST /api/v1/basic-info/items error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. 품목 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updateSql = `
      UPDATE "ItemMaster" SET
        "ItemName" = $1,
        "ItemLargeClass" = $2,
        "ItemSpecification" = $3,
        "ItemUOMCode" = $4,
        "DrawingNumber" = $5,
        "ReceiptWarehouseID" = $6,
        "IssueWarehouseID" = $7,
        "LotControlIndicator" = $8,
        "Note" = $9,
        "SafetyStock" = $10,
        "ModificationDateTime" = NOW()
      WHERE "ItemMasterSequenceNo" = $11
      RETURNING *
    `;

    const params = [
      body.itemName,
      body.category || '판매완제품',
      body.spec || '',
      body.unit || 'EA',
      body.drawingNo || '',
      body.inboundWarehouse || '',
      body.outboundWarehouse || '',
      body.requireIqc || false,
      body.usageDesc || '',
      body.unitPrice || 0,
      body.id,
    ];

    const res = await query(updateSql, params);
    return NextResponse.json({
      success: true,
      message: '품목이 수정되었습니다.',
      data: mapRowToItem(res.rows[0]),
    });
  } catch (error: any) {
    console.error('PUT /api/v1/basic-info/items error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 4. 품목 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 ID가 없습니다.' }, { status: 400 });
    }

    // 물리 삭제 대신 UseIndicator 플래그를 FALSE(비활성)로 업데이트
    await query(
      'UPDATE "ItemMaster" SET "UseIndicator" = FALSE, "ModificationDateTime" = NOW() WHERE "ItemMasterSequenceNo" = $1',
      [Number(id)]
    );

    return NextResponse.json({
      success: true,
      message: '품목이 비활성(FALSE) 처리되었습니다.',
    });
  } catch (error: any) {
    console.error('DELETE /api/v1/basic-info/items error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
