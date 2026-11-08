// src/lib/db.ts
import { Pool, QueryResult, QueryResultRow, types } from 'pg';

// PostgreSQL DATE(OID 1082) 타입을 Date 객체로 자동 변환하지 않고 원본 날짜 문자열('YYYY-MM-DD') 그대로 유지하여 Timezone 하루 밀림 방지
types.setTypeParser(1082, (val: string) => val);

// 글로벌 네임스페이스에 pool을 캐싱하여 Next.js 핫 리로딩 시 중복 연결 방지
const globalForDb = global as unknown as { dbPool: Pool };

export const pool =
  globalForDb.dbPool ||
  new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://mpsi_user:mpsi_secure_pwd@localhost:5432/mpsi_db?schema=public',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.dbPool = pool;
}

/**
 * 범용 DB 쿼리 실행 헬퍼 함수
 * 
 * [사용 예시]
 * const { rows } = await query<SiteRow>('SELECT * FROM "Site" WHERE "EnterpriseID" = $1', [enterpriseId]);
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DB Query] ${text} | params: ${JSON.stringify(params)} | ${duration}ms | rows: ${res.rowCount}`);
    }
    return res;
  } catch (error) {
    console.error(`[DB Error] query: ${text}`, error);
    throw error;
  }
}

export default pool;

