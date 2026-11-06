// src/app/api/v1/files/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storedFile = searchParams.get('file');
    const customName = searchParams.get('name') || storedFile || 'download';

    if (!storedFile) {
      return NextResponse.json({ success: false, error: 'File parameter is required' }, { status: 400 });
    }

    // 디렉토리 트래버설 방지 및 파일 경로 결정 (인코딩/디코딩 호환 지원)
    let decodedStored = decodeURIComponent(storedFile).replace(/^(\/)?uploads\//, '');
    let safeStoredFile = path.basename(decodedStored);
    let filePath = path.join(process.cwd(), 'public', 'uploads', safeStoredFile);

    try {
      await fs.access(filePath);
    } catch {
      try {
        const rawBase = path.basename(storedFile);
        const rawPath = path.join(process.cwd(), 'public', 'uploads', rawBase);
        await fs.access(rawPath);
        filePath = rawPath;
      } catch {
        // uploads 폴더에서 일치하는 파일 탐색 (타임스탬프가 붙은 파일 포함 탐색)
        try {
          const uploadDir = path.join(process.cwd(), 'public', 'uploads');
          const allFiles = await fs.readdir(uploadDir);
          const matched = allFiles.find(f => 
            f === safeStoredFile || 
            f === decodeURIComponent(safeStoredFile) ||
            f.endsWith(`_${safeStoredFile}`) ||
            f.includes(safeStoredFile) ||
            safeStoredFile.includes(f)
          );
          if (matched) {
            filePath = path.join(uploadDir, matched);
          }
        } catch (dirErr) {
          console.error("Upload dir read error:", dirErr);
        }
      }
    }

    try {
      const fileBuffer = await fs.readFile(filePath);

      // 실제 디스크 파일의 원래 확장자 파악 및 보존
      const actualExt = path.extname(filePath); // 예: ".zip"
      const diskBaseName = path.basename(filePath); // 예: "1793876615206_챗봇 보안성검토 (2).zip"
      const originalCleanName = diskBaseName.replace(/^\d+_/, ""); // 예: "챗봇 보안성검토 (2).zip"

      // 클라이언트에서 넘겨준 customName의 확장자가 실제 파일의 확장자와 다른 경우(예: .stp로 잘못 전달된 경우)
      // 실제 파일의 원래 확장자로 자동 복원
      let downloadFileName = originalCleanName;
      if (customName && customName !== 'download') {
        const decodedCustom = decodeURIComponent(customName);
        if (actualExt && !decodedCustom.toLowerCase().endsWith(actualExt.toLowerCase())) {
          const nameWithoutExt = decodedCustom.replace(/\.[^/.]+$/, "");
          downloadFileName = `${nameWithoutExt}${actualExt}`;
        } else {
          downloadFileName = decodedCustom;
        }
      }

      // 한글 파일명 인코딩 (RFC 5987 호환)
      const encodedName = encodeURIComponent(downloadFileName).replace(/['()]/g, escape).replace(/\*/g, '%2A');

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
        },
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: 'File not found on server' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('File download error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

