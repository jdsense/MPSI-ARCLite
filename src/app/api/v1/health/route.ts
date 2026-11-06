// src/app/api/v1/health/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // 1. PostgreSQL 연결 및 현재 시각 확인
    const timeRes = await query('SELECT NOW() as current_time, version() as pg_version');
    
    // 2. 생성된 전체 테이블 수 확인
    const tableRes = await query(`
      SELECT count(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    return NextResponse.json({
      status: 'UP',
      database: 'Connected',
      currentTime: timeRes.rows[0]?.current_time,
      pgVersion: timeRes.rows[0]?.pg_version,
      tableCount: Number(tableRes.rows[0]?.table_count || 0),
      nodeId: process.env.NEXT_PUBLIC_NODE_ID,
      nodeType: process.env.NEXT_PUBLIC_NODE_TYPE,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'DOWN',
        database: 'Disconnected',
        error: error.message || 'Unknown database error',
        hint: 'Docker 컨테이너가 실행 중인지 확인해 주세요. (docker compose up -d)',
      },
      { status: 503 }
    );
  }
}

