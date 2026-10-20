import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { extractVideoId } from '@/lib/youtube';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, videoId: rawVideoId } = body;

    const videoId = rawVideoId || (url ? extractVideoId(url) : null);

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: '請提供有效的 YouTube 影片網址或 Video ID' },
        { status: 400 }
      );
    }

    let transcripts: { text: string; offset: number; duration: number }[] = [];

    // 優先嘗試日文字幕 (ja)
    try {
      transcripts = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ja' });
    } catch {
      // 若失敗，嘗試預設語言字幕軌
      try {
        transcripts = await YoutubeTranscript.fetchTranscript(videoId);
      } catch (innerErr: unknown) {
        const errorMsg = innerErr instanceof Error ? innerErr.message : '無字幕';
        return NextResponse.json(
          {
            success: false,
            videoId,
            reason: 'NO_CC_AVAILABLE',
            message: `此影片未開放可讀取之字幕軌 (${errorMsg})。建議使用「手動貼上歌詞」模式，同樣可進行去重與全功能文法解析！`,
          },
          { status: 200 }
        );
      }
    }

    if (!transcripts || transcripts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          videoId,
          reason: 'EMPTY_TRANSCRIPT',
          message: '未偵測到有效字幕文字，請嘗試貼上歌詞。',
        },
        { status: 200 }
      );
    }

    // 格式化字幕資料，並過濾掉純音效標記 (如 [音樂]、[音楽]、[Music]、[拍手] 等)
    const soundMarkerRegex = /^[\s\[\(（【]*(?:音樂|音楽|Music|拍手|Applause|鼓掌|欢呼|歓声|laughter|bgm)[\s\]\)）】]*$/i;
    const inlineSoundRegex = /\[(?:音樂|音楽|Music|拍手|Applause|鼓掌|欢呼|歓声|laughter|bgm)\]|\((?:音樂|音楽|Music|拍手|Applause|鼓掌|欢呼|歓声|laughter|bgm)\)|（(?:音樂|音楽|Music|拍手|Applause|鼓掌|欢呼|歓声|laughter|bgm)）/gi;

    const lines = transcripts
      .map((t) => {
        const cleanedText = t.text
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(inlineSoundRegex, '')
          .trim();
        return {
          text: cleanedText,
          timestamp: Math.round(t.offset / 1000), // 轉成秒數
          duration: Math.round(t.duration / 1000),
        };
      })
      .filter((l) => l.text.length > 0 && !soundMarkerRegex.test(l.text));

    return NextResponse.json({
      success: true,
      videoId,
      count: lines.length,
      lines,
    });
  } catch (err: unknown) {
    console.error('Caption fetch error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : '擷取字幕發生未知錯誤',
      },
      { status: 500 }
    );
  }
}
