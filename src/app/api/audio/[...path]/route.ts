import { NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { getAuthUserId } from "@/lib/auth";

const storage = new Storage();
const bucket = storage.bucket("greatbooks-assets");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Auth check — only authenticated users can stream audio
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path: segments } = await params;
  const filePath = segments.join("/");

  // Only serve .mp3 files
  if (!filePath.endsWith(".mp3")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Map URL path to GCS path
  // URL: /api/audio/homer-iliad/audio/01.mp3 → segments: ["homer-iliad", "audio", "01.mp3"]
  // GCS: audio/homer-iliad/01.mp3
  const bookId = segments[0];
  const audioFile = segments.slice(2).join("/");
  const gcsPath = `audio/${bookId}/${audioFile}`;

  try {
    const file = bucket.file(gcsPath);
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [metadata] = await file.getMetadata();
    const stream = file.createReadStream();

    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        stream.on("end", () => controller.close());
        stream.on("error", (err: Error) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(metadata.size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
