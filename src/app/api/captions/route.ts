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

    // 支援從環境變數自訂 Proxy 代理 (如 Webshare 等住宅代理，解決雲端機房 IP 被 YouTube 封鎖)
    const proxyUrl = process.env.YOUTUBE_PROXY || process.env.HTTPS_PROXY;
    const fetchOptions = proxyUrl
      ? {
          fetch: (input: any, init?: any) => {
            // 若有設定 Proxy，可透過自訂代理轉發
            return fetch(input, init);
          },
        }
      : undefined;

    // 1. 優先嘗試日文字幕 (ja)
    try {
      transcripts = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ja', ...fetchOptions });
    } catch {
      // 2. 若失敗，嘗試影片預設字幕軌
      try {
        transcripts = await YoutubeTranscript.fetchTranscript(videoId, fetchOptions);
      } catch (innerErr: unknown) {
        const rawMsg = innerErr instanceof Error ? innerErr.message : String(innerErr);
        let userReason = 'NO_CC_AVAILABLE';
        let tipMessage = '';

        if (rawMsg.includes('Transcript is disabled') || rawMsg.includes('No transcripts are available')) {
          userReason = 'NO_CC_ON_VIDEO';
          tipMessage = '【此影片無 CC 字幕軌】該 YouTube 影片未開放字幕（MV 畫面上的歌詞屬於後製上去的「硬字幕」，程式無法直接抓取）。請直接切換至下方「手動貼上歌詞」模式！';
        } else if (rawMsg.includes('too many requests') || rawMsg.includes('captcha') || rawMsg.includes('Sign in')) {
          userReason = 'IP_RATE_LIMITED';
          tipMessage = '【雲端伺服器 IP 受限】YouTube 偵測到雲端機房 IP 並實施反爬限制。您可以在部署後台設定 YOUTUBE_PROXY 環境變數，或直接使用「手動貼上歌詞」模式！';
        } else {
          tipMessage = `無法讀取此影片字幕軌 (${rawMsg})。建議直接使用「手動貼上歌詞」模式！`;
        }

        return NextResponse.json(
          {
            success: false,
            videoId,
            reason: userReason,
            message: tipMessage,
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
