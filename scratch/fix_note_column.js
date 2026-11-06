const { Pool } = require('pg');
const fs = require('fs');

let dbUrl = 'postgresql://mpsi_user:mpsi_secure_pwd@localhost:5432/mpsi_db?schema=public';
try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (match) dbUrl = match[1];
} catch (e) {}

const pool = new Pool({ connectionString: dbUrl });

async function fixNoteColumn() {
  try {
    const colInfo = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'MpsiMoldQuotation' AND column_name = 'Note';
    `);
    console.log('BEFORE ALTER:', colInfo.rows);

    await pool.query(`ALTER TABLE "MpsiMoldQuotation" ALTER COLUMN "Note" TYPE TEXT;`);
    console.log('ALTERED TO TEXT SUCCESSFULLY!');

    const afterInfo = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'MpsiMoldQuotation' AND column_name = 'Note';
    `);
    console.log('AFTER ALTER:', afterInfo.rows);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await pool.end();
  }
}

fixNoteColumn();

