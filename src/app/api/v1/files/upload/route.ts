// src/app/api/v1/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // uploads 디렉토리 경로
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch {}

    // 안전한 고유 파일명 생성 (타임스탬프_원본파일명)
    const timestamp = Date.now();
    // 특수문자 정돈하되 한글과 확장자는 온전히 유지
    const originalName = file.name;
    const safeName = `${timestamp}_${originalName.replace(/[/\\]/g, '_')}`;
    const filePath = path.join(uploadDir, safeName);

    await fs.writeFile(filePath, buffer);

    const sizeStr = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    return NextResponse.json({
      success: true,
      url: `/uploads/${encodeURIComponent(safeName)}`,
      fileUrl: `/uploads/${encodeURIComponent(safeName)}`,
      downloadUrl: `/api/v1/files/download?file=${encodeURIComponent(safeName)}&name=${encodeURIComponent(originalName)}`,
      fileName: originalName,
      fileSize: sizeStr,
      storedName: safeName,
    });
  } catch (error: any) {
    console.error('File upload failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

