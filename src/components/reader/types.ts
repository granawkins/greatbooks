export type WordTs = {
  start_ms: number;
  end_ms: number;
  char_start: number;
  char_end: number;
};

export type Segment = {
  id: number;
  sequence: number;
  text: string;
  segment_type: "heading" | "text" | "paragraph_break";
  audio_start_ms: number | null;
  audio_end_ms: number | null;
  word_timestamps: WordTs[] | null;
};

export type ChapterData = {
  title: string;
  segments: Segment[];
  audio_file: string | null;
  audio_duration_ms: number | null;
};

export type ParagraphBlock = {
  type: "paragraph";
  segments: Segment[];
  text: string;
  charOffsets: number[];
};

export type HeadingBlock = {
  type: "heading";
  text: string;
};

export type Block = ParagraphBlock | HeadingBlock;

export type WordSpan = {
  start_ms: number;
  end_ms: number;
  charStart: number;
  charEnd: number;
};

export type NavChapter = { id: number; title: string };
export type BookMeta = {
  title: string;
  author: string;
  original_date?: string | null;
  translator?: string | null;
  translation_date?: string | null;
  source_url?: string | null;
  layout?: "prose" | "verse";
};
