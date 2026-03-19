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
  segment_type: "heading" | "text" | "paragraph_break" | "list_item";
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

export type ListBlock = {
  type: "list";
  items: string[];
};

export type Block = ParagraphBlock | HeadingBlock | ListBlock;

export type WordBoundary = { char_start: number; char_end: number };

// Flat [start_ms, end_ms] pairs for each word in a block
export type WordTimingArray = [number, number][];

export type Annotation = {
  id: number;
  start_segment_seq: number;
  start_char: number;
  end_segment_seq: number;
  end_char: number;
  type: "highlight" | "comment";
  color: string;
  comment_text: string | null;
  created_at: string;
};

export type NavChapter = { id: number; title: string; sourceBookTitle?: string };
export type BookMeta = {
  title: string;
  author: string;
  original_date?: string | null;
  translator?: string | null;
  translation_date?: string | null;
  source_url?: string | null;
  layout?: "prose" | "verse";
  type?: "book" | "course";
};
