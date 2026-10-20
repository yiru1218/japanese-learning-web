export interface TranscriptItem {
  text: string;
  offset: number; // in milliseconds or seconds
  duration: number;
}

export interface RawLyricLine {
  text: string;
  timestamp?: number; // in seconds
}

export interface VocabItem {
  word: string;
  reading: string;
  baseForm: string;
  pos: string; // 詳細詞性 (如: 五段自動詞、下一段他動詞、な形容詞、格助詞、副助詞...)
  conjugation?: string; // 活用變化形 (如: 連用形促音便（て型）、過去形（た型）、未然形、可能形...)
  function?: string; // 文法功能或語境說明 (如: 表動作對象、表動作完了與遺憾感...)
  meaning: string;
  jlpt?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
}

export interface GrammarItem {
  pattern: string;
  explanation: string;
  meaning?: string; // 句中文法簡短中文意思 (如: 命令/住手、如同/以便、漸漸/持續)
  target?: string; // 句中對應文字片段，如 "ように"、"てゆく"、"だけの"
  jlpt?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | string; // 文法等級標記
}

export interface AnalyzedLine {
  id: string;
  original: string;
  furigana: string; // 格式如: 乾[かわ]いた風[かぜ]
  romaji: string;
  translation: {
    literal: string; // 直譯
    poetic: string;  // 意譯 / 歌詞流暢翻
  };
  vocabulary: VocabItem[];
  grammar: GrammarItem[];
  nuance: string; // 口語語感、隱喻或特殊意境
  occurrences: number; // 出現次數 (去重統計)
  timestamps: number[]; // 各次出現的秒數
}

export interface SongData {
  id?: string;
  videoId?: string;
  title: string;
  artist?: string;
  sourceType: 'youtube' | 'manual' | 'demo';
  totalLines: number;
  uniqueLines: number;
  lines: AnalyzedLine[];
  savedAt?: number; // 儲存時間戳記
}

export type FuriganaMode = 'show' | 'hide' | 'hover';
