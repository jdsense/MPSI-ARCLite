import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "src", "img", "ARCFORGE_LOGO_w.png");
    if (!fs.existsSync(filePath)) {
      return new NextResponse("Logo not found", { status: 404 });
    }
    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e: unknown) {
    return new NextResponse("Error reading logo", { status: 500 });
  }
}

