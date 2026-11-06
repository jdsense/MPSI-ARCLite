import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

async function ensureTableInitialized() {
  await query(`
    CREATE TABLE IF NOT EXISTS "MpsiNotifications" (
      "NotificationID" VARCHAR(64) PRIMARY KEY,
      "MenuName" VARCHAR(100) NOT NULL,
      "MenuPath" VARCHAR(255) NOT NULL,
      "SenderCompany" VARCHAR(100) NOT NULL,
      "Content" TEXT NOT NULL,
      "ProjectID" VARCHAR(64),
      "TargetRole" VARCHAR(50) NOT NULL,
      "TargetVendorName" VARCHAR(100),
      "IsConfirmed" BOOLEAN DEFAULT FALSE,
      "CreationDateTime" TIMESTAMP DEFAULT NOW(),
      "ConfirmedDateTime" TIMESTAMP
    );
  `);

  // 테이블이 비어 있는 경우 실제 프로젝트(MI26005P0) 기반 초기 업무 알림 시드 (사람 이름 없이 회사명만 사용)
  const countRes = await query(`SELECT COUNT(*) as count FROM "MpsiNotifications"`);
  if (Number(countRes.rows[0]?.count || 0) === 0) {
    const seedNotifications = [
      {
        id: "noti-init-1",
        menuName: "양산외주 - 양산견적관리",
        menuPath: "/portal/vendor-portal/mass/quotation",
        senderCompany: "MPSI",
        content: "[MI26005P0] Door Armrest Base 사출 양산 견적 요청 및 단가 산출 검토가 전달되었습니다.",
        projectNo: "MI26005P0",
        targetRole: "VENDOR_MASS",
        targetVendorName: "(주)뉴몰드",
        createdAt: "2026-11-05 14:00:00",
      },
      {
        id: "noti-init-2",
        menuName: "금형외주 - 시사출/육성",
        menuPath: "/portal/vendor-portal/mold/trial",
        senderCompany: "MPSI",
        content: "[MI26005P0] 금형 이관 5대 필수 서류 최종 승인이 완료되었습니다. 양산처 이관 일정 확인 바랍니다.",
        projectNo: "MI26005P0",
        targetRole: "VENDOR_MOLD",
        targetVendorName: "우성정공(주)",
        createdAt: "2026-11-05 15:30:00",
      },
      {
        id: "noti-init-3",
        menuName: "양산성 검증/시양산",
        menuPath: "/portal/mass-prod/validation",
        senderCompany: "(주)뉴몰드",
        content: "[MI26005P0] Door Armrest Base 12H 연속 사출 및 6대 성적서 등록이 완료되어 MPSI 승인 검토 요청드립니다.",
        projectNo: "MI26005P0",
        targetRole: "MPSI",
        targetVendorName: null,
        createdAt: "2026-11-05 16:15:00",
      },
    ];

    for (const noti of seedNotifications) {
      await query(
        `INSERT INTO "MpsiNotifications" (
          "NotificationID", "MenuName", "MenuPath", "SenderCompany",
          "Content", "ProjectID", "TargetRole", "TargetVendorName",
          "IsConfirmed", "CreationDateTime"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9)
        ON CONFLICT ("NotificationID") DO NOTHING`,
        [
          noti.id,
          noti.menuName,
          noti.menuPath,
          noti.senderCompany,
          noti.content,
          noti.projectNo,
          noti.targetRole,
          noti.targetVendorName,
          noti.createdAt,
        ]
      );
    }
  }
}

function mapRowToNotification(row: any) {
  const d = new Date(row.CreationDateTime);
  const formattedDate = !isNaN(d.getTime())
    ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    : String(row.CreationDateTime);

  return {
    id: row.NotificationID,
    menuName: row.MenuName,
    menuPath: row.MenuPath,
    senderCompany: row.SenderCompany,
    senderName: row.SenderCompany, // 사용자 이름 대신 회사이름 통일
    content: row.Content,
    projectNo: row.ProjectID || undefined,
    targetRole: row.TargetRole,
    targetVendorName: row.TargetVendorName || undefined,
    createdAt: formattedDate,
    isConfirmed: Boolean(row.IsConfirmed),
    confirmedAt: row.ConfirmedDateTime ? String(row.ConfirmedDateTime) : undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    await ensureTableInitialized();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || "";
    const vendorName = searchParams.get("vendorName") || "";

    let sql = `
      SELECT "NotificationID", "MenuName", "MenuPath", "SenderCompany",
             "Content", "ProjectID", "TargetRole", "TargetVendorName",
             "IsConfirmed", "CreationDateTime", "ConfirmedDateTime"
      FROM "MpsiNotifications"
    `;
    const params: any[] = [];

    // 계정별 타겟 필터링 (사용자 요청: "각 계정에 맞게 업데이트 되어야해. MPSI가 우성정공한테 남기면 우성정공 알림에만")
    if (role === "MPSI") {
      sql += ` WHERE ("TargetRole" = 'MPSI' OR "TargetRole" = 'ALL')`;
    } else if (role === "VENDOR_MOLD") {
      const cleanVendor = (vendorName || "우성정공").replace(/[\(\)\s]/g, "");
      sql += ` WHERE "TargetRole" IN ('VENDOR_MOLD', 'ALL') AND ("TargetVendorName" IS NULL OR "TargetVendorName" ILIKE $1 OR "TargetVendorName" ILIKE '%우성%')`;
      params.push(`%${cleanVendor}%`);
    } else if (role === "VENDOR_MASS") {
      const cleanVendor = (vendorName || "뉴몰드").replace(/[\(\)\s]/g, "");
      sql += ` WHERE "TargetRole" IN ('VENDOR_MASS', 'ALL') AND ("TargetVendorName" IS NULL OR "TargetVendorName" ILIKE $1 OR "TargetVendorName" ILIKE '%뉴몰드%')`;
      params.push(`%${cleanVendor}%`);
    }

    sql += ` ORDER BY "CreationDateTime" DESC LIMIT 50`;

    const res = await query(sql, params);
    const notifications = res.rows.map(mapRowToNotification);

    return NextResponse.json({
      success: true,
      data: notifications,
      total: notifications.length,
    });
  } catch (error: any) {
    console.error("GET /api/v1/notifications error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTableInitialized();
    const body = await req.json();

    const {
      menuName,
      menuPath,
      senderCompany,
      content,
      projectNo,
      targetRole,
      targetVendorName,
    } = body;

    if (!menuName || !content || !targetRole) {
      return NextResponse.json(
        { success: false, error: "menuName, content, and targetRole are required" },
        { status: 400 }
      );
    }

    const notiId = `noti-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const cleanSenderCompany = senderCompany ? senderCompany.replace(/\s+[가-힣]+(\s*(차장|부장|과장|대리|팀장|이사|수석|대표))?/g, "").trim() : "MPSI";

    await query(
      `INSERT INTO "MpsiNotifications" (
        "NotificationID", "MenuName", "MenuPath", "SenderCompany",
        "Content", "ProjectID", "TargetRole", "TargetVendorName",
        "IsConfirmed", "CreationDateTime"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, NOW())`,
      [
        notiId,
        menuName,
        menuPath || "/portal",
        cleanSenderCompany,
        content,
        projectNo || null,
        targetRole,
        targetVendorName || null,
      ]
    );

    const createdRes = await query(
      `SELECT * FROM "MpsiNotifications" WHERE "NotificationID" = $1`,
      [notiId]
    );

    const createdNoti = mapRowToNotification(createdRes.rows[0]);

    return NextResponse.json({
      success: true,
      data: createdNoti,
      message: "Notification created successfully",
    });
  } catch (error: any) {
    console.error("POST /api/v1/notifications error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create notification" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureTableInitialized();
    const body = await req.json();
    const { id, all, role, vendorName } = body;

    if (all) {
      // 해당 계정의 모든 미확인 알림 일괄 확인
      let sql = `UPDATE "MpsiNotifications" SET "IsConfirmed" = TRUE, "ConfirmedDateTime" = NOW() WHERE "IsConfirmed" = FALSE`;
      const params: any[] = [];

      if (role === "MPSI") {
        sql += ` AND ("TargetRole" = 'MPSI' OR "TargetRole" = 'ALL')`;
      } else if (role === "VENDOR_MOLD") {
        sql += ` AND "TargetRole" IN ('VENDOR_MOLD', 'ALL')`;
      } else if (role === "VENDOR_MASS") {
        sql += ` AND "TargetRole" IN ('VENDOR_MASS', 'ALL')`;
      }

      await query(sql, params);
      return NextResponse.json({ success: true, message: "All notifications confirmed" });
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Notification id is required" },
        { status: 400 }
      );
    }

    await query(
      `UPDATE "MpsiNotifications" SET "IsConfirmed" = TRUE, "ConfirmedDateTime" = NOW() WHERE "NotificationID" = $1`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: `Notification ${id} confirmed`,
    });
  } catch (error: any) {
    console.error("PATCH /api/v1/notifications error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to confirm notification" },
      { status: 500 }
    );
  }
}

