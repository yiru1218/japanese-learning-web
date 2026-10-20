import { NextRequest, NextResponse } from 'next/server';
import { AnalyzedLine } from '@/types';

interface InputLine {
  original: string;
  occurrences: number;
  timestamps: number[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lines, apiKey: clientApiKey } = body as {
      lines: InputLine[];
      apiKey?: string;
    };

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: '請提供欲分析之歌詞列表' }, { status: 400 });
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

    // 若未設定 API Key，回傳明確提示並可提供簡易啟發式模擬數據
    if (!apiKey) {
      return NextResponse.json({
        warning: 'NO_API_KEY',
        message: '未檢測到 Gemini API Key。您可以在右上角「API 設定」輸入您的免費 Gemini API Key，或直接瀏覽內建示範歌曲！',
        analyzedLines: generateFallbackAnalysis(lines),
      });
    }

    // 呼叫 Gemini API 進行專業日語歌詞解析
    const analyzedLines = await analyzeWithGemini(lines, apiKey);

    return NextResponse.json({
      success: true,
      analyzedLines,
    });
  } catch (err: unknown) {
    console.error('Analysis error:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : '分析過程發生未知錯誤',
      },
      { status: 500 }
    );
  }
}

/**
 * 透過 Google Gemini API 進行日語歌詞文法單字結構化分析
 */
async function analyzeWithGemini(lines: InputLine[], apiKey: string): Promise<AnalyzedLine[]> {
  const prompt = `你是一位專業且生動的日語教學名師與歌詞文學賞析專家。
請分析以下來自日語歌曲的【不重複歌詞句子清單】。每一句都需要給出詳細的日語學習筆記。

歌詞句子列表：
${JSON.stringify(lines.map((l, idx) => ({ index: idx, text: l.original })))}

請嚴格以繁體中文（台灣習慣用語）輸出，並遵循以下 JSON 格式陣列回傳：
[
  {
    "index": 0,
    "furigana": "標註漢字假名的格式，如：乾[かわ]いた風[かぜ]が通[とお]り抜[ぬ]けていく（注意：不需要提供羅馬拼音）",
    "translation": {
      "literal": "直譯（忠實貼合字面意思）",
      "poetic": "意境流暢翻譯（富有中文美感與歌詞韻味）"
    },
    "vocabulary": [
      {
        "word": "單字（歌詞中的實際出現形態，如：笑ってしまう、広がる、沈む）",
        "reading": "平假名讀音（如：わらってしまう、ひろがる、しずむ）",
        "baseForm": "辭書形 / 原形（如：笑う、広がる、沈む）",
        "pos": "詳細詞性分類（請務必提供深度精準的品詞分類，例如：動詞需標註五段活用/一段活用及【自動詞/他動詞】與行別，如「五段活用自動詞（カ行）」、「下一段活用他動詞」；形容詞註明「い形容詞」或「な形容詞（形容動詞）」；助詞需註明「格助詞（表主格/對象/著落點）」、「副助詞（表限定/並列）」、「接続助詞」；名詞註明「普通名詞」、「抽象名詞」、「形式名詞」、「代名詞」；以及「副詞（擬態語/程度）」等）",
        "conjugation": "活用變化形式與音便現象（如：「連用形促音便＋て型（表接續）」、「未然形＋ない（否定）」、「連體形（修飾名詞）」、「假定形（ば型）」、「意向形」、「受身形（被動態）」、「使役形」、「可能形」、「辭書形（基本形）」；若為無活用詞則標註「無活用」）",
        "function": "在句中的具體文法機能與修辭用法剖析（如：「標記主語並帶排他焦點」、「接續補助動詞表動作消逝與推移之進行態」、「表動作完了並隱含無奈或遺憾語氣」、「表空間移動的方向與到達點」等深入說明）",
        "meaning": "繁體中文精確釋義（切合歌詞語境）",
        "jlpt": "N1|N2|N3|N4|N5 (評估最接近之等級)"
      }
    ],
    "grammar": [
      {
        "pattern": "文法句型接續公式（例如：動詞連用形＋ていく、動詞た形＋まま、名詞＋でいっぱいだ、動詞連體形＋ように、動詞命令形）",
        "target": "該文法在該句日文歌詞中實際對應的文字片段（如：ように、てゆく、だけの、重なっていた、がした、やめろ、まま），必須與歌詞文字完全精確吻合，以便前端精準標註",
        "meaning": "該文法的繁體中文核心語意標籤（2~6個繁體中文字，例如：「表狀態維持」、「動作持續漸進」、「比較基準」、「表願望/祈願」、「遺憾完了態」、「動詞命令態」、「被動受身態」、「假定條件」；⚠️ 嚴禁填寫日文句型公式，必須是核心中文語意說明！）",
        "explanation": "深度且具體的文法解析，請包含：①【接續與機能】說明其接續規則與核心文法意義；②【歌詞語境與情緒】剖析在此句歌詞中渲染了何種情感氛圍（如無奈感傷、決心、溫柔期盼等）；③【口語縮約（若有）】說明口語變形由來（如〜ちゃう、〜なきゃ、〜てる）",
        "jlpt": "N1|N2|N3|N4|N5|常用口語 (評估此文法所屬等級)"
      }
    ],
    "nuance": "該句在歌詞中的意境、特殊口語縮約或感情隱喻說明"
  }
]

注意：
1. 【不需要】輸出任何羅馬拼音或注音拼音。
2. 【略過 YouTube 字幕音效標記】若句子中含有如 [音樂]、[音楽]、[Music]、[拍手]、[Applause] 等標記，請在解析時直接忽略並自動去除這些標記，絕不要將其視為歌詞、日語單字或文法進行分析。
3. 【重要排版規範】送假名（Okurigana）必須留在括號外！
   - 正確範例：「散[ち]った」、「笑[わら]って」、「砕[くだ]けて」、「忘[わす]れた」
   - 錯誤禁例：「散[ちった]」、「笑[わらって]」、「砕[くだけて]」
4. 【詞性與活用深度說明】詞性 (pos) 與活用變化 (conjugation) 必須專業且詳實，不可僅簡寫為「動詞」或「名詞」，請詳述其活用種類（如：五段活用自動詞 マ行、下一段他動詞）、具體變化形（如：連用形促音便、未然形）以及在該句歌詞中扮演的文法機能 (function)。
5. 【文法深度與情緒氛圍】請敏銳捕捉歌詞中出現的各類句型與動詞組合（如補助動詞複合體 〜てゆく/ていく/てしまう/ておく、狀態維持 〜たまま、比喻/目標 〜ように、程度/限定 〜ばかり/〜だけ、授受動詞、動詞態變化等）。explanation 必須講透其接續原理與在歌詞意境中蘊含的情感 nuance。
請只輸出純 JSON 陣列，不要加入額外的 markdown 程式碼區塊標籤。`;

  // 動態向 Google API 查詢此 API Key 支援且可用的模型清單
  const discoveredModels = await getAvailableModels(apiKey);
  let res: Response | null = null;
  let lastError = '';
  let had503 = false;

  for (const model of discoveredModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // 針對每個模型最多重試 3 次 (指數退避 1.5s, 3s 應對尖峰短暫高負載)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          }),
        });

        if (response.ok) {
          res = response;
          break;
        }

        const errorData = await response.json().catch(() => ({}));
        lastError =
          (errorData as { error?: { message?: string } })?.error?.message || response.statusText;

        // 如果是 404 (無此模型)，直接切換下一個模型
        if (response.status === 404) {
          break;
        }

        // 若是 503 (尖峰超載) 或 429 (限流)，記錄並等待後重試
        if (response.status === 503 || response.status === 429) {
          had503 = true;
          // 指數等待 1.5s, 3s
          await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    if (res && res.ok) {
      break;
    }
  }

  if (!res || !res.ok) {
    if (had503) {
      throw new Error('Google Gemini 伺服器目前尖峰繁忙 (503 High Demand)，尖峰通常只維持數秒，請稍候 5~10 秒後再次點擊分析！');
    }
    throw new Error(`Gemini API 請求未完成: ${lastError || '請稍候再試'}`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini API 未回傳內容');
  }

  const cleanedJson = rawText.trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
  const parsedItems = JSON.parse(cleanedJson);

  // 將 AI 分析結果與原始時間戳與出現次數組裝
  return lines.map((originalLine, idx) => {
    const item = Array.isArray(parsedItems)
      ? parsedItems.find((p: { index?: number }) => p.index === idx) || parsedItems[idx]
      : null;

    return {
      id: `line-${idx}-${Date.now()}`,
      original: originalLine.original,
      furigana: item?.furigana || originalLine.original,
      romaji: item?.romaji || '',
      translation: {
        literal: item?.translation?.literal || '暫無直譯',
        poetic: item?.translation?.poetic || '暫無意譯',
      },
      vocabulary: Array.isArray(item?.vocabulary) ? item.vocabulary : [],
      grammar: Array.isArray(item?.grammar) ? item.grammar : [],
      nuance: item?.nuance || '',
      occurrences: originalLine.occurrences || 1,
      timestamps: originalLine.timestamps || [],
    };
  });
}

/**
 * 離線或無 API Key 時的快速啟發式基礎解析（確保不會白畫面）
 */
function generateFallbackAnalysis(lines: InputLine[]): AnalyzedLine[] {
  return lines.map((line, idx) => ({
    id: `fallback-${idx}`,
    original: line.original,
    furigana: line.original,
    romaji: '請輸入 Gemini API Key 以獲取完整拼音',
    translation: {
      literal: '（請在右上角設定 API Key 以啟用即時 AI 翻譯）',
      poetic: '（請在右上角設定 API Key 以啟用即時 AI 翻譯）',
    },
    vocabulary: [
      {
        word: line.original.slice(0, 4),
        reading: '...',
        baseForm: line.original.slice(0, 4),
        pos: '詞彙',
        meaning: '設定 API Key 後即可自動識別詞性、原形與釋義',
        jlpt: 'N3',
      },
    ],
    grammar: [
      {
        pattern: '句型解析需連線 AI',
        explanation: '在「API 設定」中輸入免費的 Gemini API Key，即可取得完整文法講解！',
      },
    ],
    nuance: `本句在全曲中共出現 ${line.occurrences} 次。`,
    occurrences: line.occurrences,
    timestamps: line.timestamps,
  }));
}

/**
 * 向 Google Gemini API 查詢此 API Key 真正具備使用權限的模型清單
 */
async function getAvailableModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const list = ((data.models || []) as { name: string; supportedGenerationMethods?: string[] }[])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace(/^models\//, ''));

      // 優先排列支援 flash 的模型（特別是 3.8-flash 與 2.0-flash）
      const flashModels = list.filter((n) => n.includes('flash'));
      const otherModels = list.filter((n) => !n.includes('flash'));

      const prioritized = [
        ...flashModels.sort((a, b) => {
          if (a.includes('3.8')) return -1;
          if (b.includes('3.8')) return 1;
          if (a.includes('2.0')) return -1;
          if (b.includes('2.0')) return 1;
          return 0;
        }),
        ...otherModels,
      ];

      if (prioritized.length > 0) {
        return prioritized;
      }
    }
  } catch (e) {
    console.warn('動態獲取 Gemini 模型列表失敗，使用預設值:', e);
  }

  // 預設兜底清單
  return ['gemini-3.8-flash'];
}

