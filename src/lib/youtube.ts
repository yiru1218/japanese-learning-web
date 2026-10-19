import { RawLyricLine } from '@/types';

/**
 * 從各種常見的 YouTube 網址格式中解析 Video ID
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();

  // 直接輸入 11 碼 ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  // https://www.youtube.com/watch?v=XXXX
  const watchMatch = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // https://youtu.be/XXXX
  const shortMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // https://www.youtube.com/embed/XXXX
  const embedMatch = cleanUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // https://www.youtube.com/shorts/XXXX
  const shortsMatch = cleanUrl.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  return null;
}

/**
 * 將秒數轉為 mm:ss 格式
 */
export function formatTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * 清理單句歌詞 (去除常見音符、前後多餘空白與無意義括號)
 */
export function cleanLyricLine(line: string): string {
  return line
    .replace(/[♪♫#~～]+/g, '')
    .replace(/^[\s　]+|[\s　]+$/g, '')
    .trim();
}

/**
 * 正規化比對用 key (去除所有標點與空白)
 */
export function normalizeLineKey(line: string): string {
  return line
    .replace(/[、。！？!?,.\s　「」『』()（）]/g, '')
    .toLowerCase();
}

/**
 * 歌詞去重處理 (保留出現順序，但統計重複次數與收集各次時間戳)
 */
export function deduplicateLines(rawLines: RawLyricLine[]): {
  original: string;
  occurrences: number;
  timestamps: number[];
}[] {
  const map = new Map<string, { original: string; occurrences: number; timestamps: number[] }>();
  const order: string[] = [];

  for (const item of rawLines) {
    const cleaned = cleanLyricLine(item.text);
    if (!cleaned) continue;

    const key = normalizeLineKey(cleaned);
    if (!key) continue;

    if (map.has(key)) {
      const entry = map.get(key)!;
      entry.occurrences += 1;
      if (item.timestamp !== undefined && !entry.timestamps.includes(item.timestamp)) {
        entry.timestamps.push(item.timestamp);
      }
    } else {
      map.set(key, {
        original: cleaned,
        occurrences: 1,
        timestamps: item.timestamp !== undefined ? [item.timestamp] : [],
      });
      order.push(key);
    }
  }

  return order.map((key) => map.get(key)!);
}
