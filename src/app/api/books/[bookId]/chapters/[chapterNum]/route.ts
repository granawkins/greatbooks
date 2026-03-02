import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type SegmentInfo = {
  id: number;
  audio_start_ms: number | null;
  audio_end_ms: number | null;
  word_timestamps: { start_ms: number; end_ms: number; char_start: number; char_end: number }[] | null;
  char_offset: number; // where this segment starts within the joined paragraph text
};

type ParagraphOut = {
  text: string;
  segments: SegmentInfo[];
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookId: string; chapterNum: string }> }
) {
  const { bookId, chapterNum } = await params;
  const chapter = db.getChapter(bookId, Number(chapterNum));
  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const segments = db.getSegments(chapter.id);

  // Group segments into paragraphs by group_number
  const paragraphs: ParagraphOut[] = [];
  let currentGroup: number | null = null;
  let currentSentences: string[] = [];
  let currentSegInfos: Omit<SegmentInfo, "char_offset">[] = [];

  const flushParagraph = () => {
    if (currentSentences.length === 0) return;
    // Compute char_offset for each segment within the joined paragraph text
    // Segments are joined with " " (one space)
    let offset = 0;
    const segsWithOffset: SegmentInfo[] = currentSegInfos.map((s, i) => {
      const charOffset = offset;
      offset += currentSentences[i].length + 1; // +1 for the joining space
      return { ...s, char_offset: charOffset };
    });
    paragraphs.push({
      text: currentSentences.join(" "),
      segments: segsWithOffset,
    });
  };

  for (const seg of segments) {
    if (seg.segment_type !== "text") continue;

    if (seg.group_number !== currentGroup) {
      flushParagraph();
      currentGroup = seg.group_number;
      currentSentences = [seg.text];
      currentSegInfos = [{
        id: seg.id,
        audio_start_ms: seg.audio_start_ms,
        audio_end_ms: seg.audio_end_ms,
        word_timestamps: seg.word_timestamps ? JSON.parse(seg.word_timestamps) : null,
      }];
    } else {
      currentSentences.push(seg.text);
      currentSegInfos.push({
        id: seg.id,
        audio_start_ms: seg.audio_start_ms,
        audio_end_ms: seg.audio_end_ms,
        word_timestamps: seg.word_timestamps ? JSON.parse(seg.word_timestamps) : null,
      });
    }
  }
  flushParagraph();

  return NextResponse.json({
    id: chapter.id,
    number: chapter.number,
    title: chapter.title,
    paragraphs,
    audio_file: chapter.audio_file,
    audio_duration_ms: chapter.audio_duration_ms,
  });
}
