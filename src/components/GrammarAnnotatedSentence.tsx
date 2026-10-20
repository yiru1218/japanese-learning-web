'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GrammarItem, VocabItem, FuriganaMode } from '@/types';
import { RubyText, VocabRubyText } from './RubyText';
import { Sparkles, BookOpen } from 'lucide-react';

interface GrammarAnnotatedSentenceProps {
  furigana: string;
  original: string;
  grammar?: GrammarItem[];
  vocabulary?: VocabItem[];
  mode?: FuriganaMode;
  activeGrammarIndex?: number | null;
  activeVocabIndex?: number | null;
  onSelectGrammar?: (idx: number) => void;
  onSelectVocab?: (idx: number) => void;
  showAnnotations?: boolean;
  translationSlot?: React.ReactNode;
}

interface CharMapping {
  fStart: number;
  fEnd: number;
}

/**
 * 智慧定位 Tooltip：自動計算視窗頂部可用高度，
 * 若上方空間不足（< 240px），自動翻轉到下方顯示，避免被瀏覽器頂部截斷
 */
interface SmartTooltipProps {
  children: React.ReactNode;
  borderClass?: string;
  className?: string;
}

const SmartTooltip: React.FC<SmartTooltipProps> = ({
  children,
  borderClass = 'border-amber-500/50',
  className = '',
}) => {
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const tooltipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;

    const checkPosition = () => {
      const parent = el.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const tooltipHeight = el.offsetHeight || 220;

      // 若觸發元素頂部距瀏覽器視窗頂部小於 (Tooltip高度 + 24px安全邊距)，則向下顯示
      if (parentRect.top < tooltipHeight + 24) {
        setPlacement('bottom');
      } else {
        setPlacement('top');
      }
    };

    checkPosition();
    window.addEventListener('scroll', checkPosition, { passive: true });
    window.addEventListener('resize', checkPosition, { passive: true });

    return () => {
      window.removeEventListener('scroll', checkPosition);
      window.removeEventListener('resize', checkPosition);
    };
  }, []);

  const isTop = placement === 'top';

  return (
    <span
      ref={tooltipRef}
      className={`absolute left-1/2 -translate-x-1/2 w-80 max-w-[92vw] p-4 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border ${borderClass} shadow-2xl shadow-black/80 z-[80] text-left pointer-events-auto transition-all duration-200 select-text ${
        isTop
          ? 'bottom-full mb-3 before:absolute before:inset-x-0 before:top-full before:h-4 before:content-[\'\']'
          : 'top-full mt-3 before:absolute before:inset-x-0 before:bottom-full before:h-4 before:content-[\'\']'
      } ${className}`}
    >
      {children}

      {/* 小三角形指示箭頭 */}
      {isTop ? (
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900 block pointer-events-none" />
      ) : (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-slate-900 block pointer-events-none" />
      )}
    </span>
  );
};

const GRAMMAR_COLORS = [
  {
    bracket: 'border-amber-400 shadow-[0_2px_8px_rgba(245,158,11,0.25)]',
    activeBracket: 'border-amber-300 shadow-[0_2px_12px_rgba(245,158,11,0.5)] scale-[1.01]',
    bg: 'bg-transparent',
    hoverBg: 'hover:bg-amber-400/[0.08]',
    activeBg: 'bg-amber-400/15',
    border: 'border-amber-400/40',
    badge: 'bg-amber-400 text-slate-950 shadow-sm font-black',
    badgeMuted: 'bg-amber-500/15 text-amber-300 border border-amber-500/40 backdrop-blur-sm',
    tooltipBorder: 'border-amber-500/50',
    titleText: 'text-amber-300',
    dot: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]',
    pillGradient: 'from-amber-500/20 to-amber-500/5',
    capsule: 'bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500/25 hover:border-amber-400 backdrop-blur-sm shadow-sm',
    activeCapsule: 'bg-amber-500/30 text-amber-100 border-amber-400 ring-1 ring-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.3)] backdrop-blur-sm',
    meaningCapsule: 'bg-amber-500/10 text-amber-300 border-amber-500/30 backdrop-blur-sm',
  },
  {
    bracket: 'border-violet-400 shadow-[0_2px_8px_rgba(139,92,246,0.25)]',
    activeBracket: 'border-violet-300 shadow-[0_2px_12px_rgba(139,92,246,0.5)] scale-[1.01]',
    bg: 'bg-transparent',
    hoverBg: 'hover:bg-violet-400/[0.08]',
    activeBg: 'bg-violet-400/15',
    border: 'border-violet-400/40',
    badge: 'bg-violet-400 text-slate-950 shadow-sm font-black',
    badgeMuted: 'bg-violet-500/15 text-violet-300 border border-violet-500/40 backdrop-blur-sm',
    tooltipBorder: 'border-violet-500/50',
    titleText: 'text-violet-300',
    dot: 'bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]',
    pillGradient: 'from-violet-500/20 to-violet-500/5',
    capsule: 'bg-violet-500/15 text-violet-300 border-violet-500/35 hover:bg-violet-500/25 hover:border-violet-400 backdrop-blur-sm shadow-sm',
    activeCapsule: 'bg-violet-500/30 text-violet-100 border-violet-400 ring-1 ring-violet-400/50 shadow-[0_0_12px_rgba(139,92,246,0.3)] backdrop-blur-sm',
    meaningCapsule: 'bg-violet-500/10 text-violet-300 border-violet-500/30 backdrop-blur-sm',
  },
  {
    bracket: 'border-emerald-400 shadow-[0_2px_8px_rgba(16,185,129,0.25)]',
    activeBracket: 'border-emerald-300 shadow-[0_2px_12px_rgba(16,185,129,0.5)] scale-[1.01]',
    bg: 'bg-transparent',
    hoverBg: 'hover:bg-emerald-400/[0.08]',
    activeBg: 'bg-emerald-400/15',
    border: 'border-emerald-400/40',
    badge: 'bg-emerald-400 text-slate-950 shadow-sm font-black',
    badgeMuted: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 backdrop-blur-sm',
    tooltipBorder: 'border-emerald-500/50',
    titleText: 'text-emerald-300',
    dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]',
    pillGradient: 'from-emerald-500/20 to-emerald-500/5',
    capsule: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/25 hover:border-emerald-400 backdrop-blur-sm shadow-sm',
    activeCapsule: 'bg-emerald-500/30 text-emerald-100 border-emerald-400 ring-1 ring-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] backdrop-blur-sm',
    meaningCapsule: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 backdrop-blur-sm',
  },
  {
    bracket: 'border-sky-400 shadow-[0_2px_8px_rgba(56,189,248,0.25)]',
    activeBracket: 'border-sky-300 shadow-[0_2px_12px_rgba(56,189,248,0.5)] scale-[1.01]',
    bg: 'bg-transparent',
    hoverBg: 'hover:bg-sky-400/[0.08]',
    activeBg: 'bg-sky-400/15',
    border: 'border-sky-400/40',
    badge: 'bg-sky-400 text-slate-950 shadow-sm font-black',
    badgeMuted: 'bg-sky-500/15 text-sky-300 border border-sky-500/40 backdrop-blur-sm',
    tooltipBorder: 'border-sky-500/50',
    titleText: 'text-sky-300',
    dot: 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]',
    pillGradient: 'from-sky-500/20 to-sky-500/5',
    capsule: 'bg-sky-500/15 text-sky-300 border-sky-500/35 hover:bg-sky-500/25 hover:border-sky-400 backdrop-blur-sm shadow-sm',
    activeCapsule: 'bg-sky-500/30 text-sky-100 border-sky-400 ring-1 ring-sky-400/50 shadow-[0_0_12px_rgba(56,189,248,0.3)] backdrop-blur-sm',
    meaningCapsule: 'bg-sky-500/10 text-sky-300 border-sky-500/30 backdrop-blur-sm',
  },
];

const JLPT_BADGES: Record<string, string> = {
  N1: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]',
  N2: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
  N3: 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-[0_0_8px_rgba(14,165,233,0.2)]',
  N4: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
  N5: 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.2)]',
};

/**
 * 建立 original 原文與 furigana 假名標籤字串的 1-to-1 映射表
 */
function buildOrigToFuriganaMap(original: string, furigana: string): CharMapping[] {
  const map: CharMapping[] = [];
  const rubyRegex = /([\u4E00-\u9FAF\u3400-\u4DBF々ヶ〆\u30A0-\u30FFA-Za-z0-9]+)\[([^\[\]]+)\]/g;
  let match;
  let lastIndex = 0;

  while ((match = rubyRegex.exec(furigana)) !== null) {
    const plainText = furigana.slice(lastIndex, match.index);
    for (let i = 0; i < plainText.length; i++) {
      map.push({ fStart: lastIndex + i, fEnd: lastIndex + i + 1 });
    }

    const kanji = match[1];
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;

    for (let k = 0; k < kanji.length; k++) {
      map.push({ fStart: matchStart, fEnd: matchEnd });
    }

    lastIndex = matchEnd;
  }

  const remaining = furigana.slice(lastIndex);
  for (let i = 0; i < remaining.length; i++) {
    map.push({ fStart: lastIndex + i, fEnd: lastIndex + i + 1 });
  }

  return map;
}

/**
 * 從文法 item (pattern 與 explanation) 智慧解析在 original 中的對應文字
 */
function findTargetInOriginal(item: GrammarItem, original: string): string | null {
  if (item.target && original.includes(item.target)) {
    return item.target;
  }
  const pattern = item.pattern || '';
  if (pattern && original.includes(pattern)) return pattern;

  const candidates: string[] = [];

  // 1. 優先從 explanation 中提取引號內的日文片語（如「増えていって」）
  if (item.explanation) {
    const expQuotes = item.explanation.match(/「([^」]+)」/g);
    if (expQuotes) {
      expQuotes.forEach((q) => {
        const text = q.slice(1, -1).trim();
        if (text && original.includes(text)) {
          candidates.push(text);
        }
      });
    }
  }

  // 2. 從 pattern 的引號中提取
  const quoteMatch = pattern.match(/「([^」]+)」/);
  if (quoteMatch) candidates.push(quoteMatch[1]);

  // 3. 從 pattern 括號中提取
  const parenMatches = pattern.match(/\(([^)]+)\)/g);
  if (parenMatches) {
    parenMatches.forEach((p) => {
      const clean = p.slice(1, -1).trim();
      clean.split(/[\s,、\/->]+/).forEach((w) => candidates.push(w));
    });
  }

  // 4. 清理並切分 pattern
  pattern
    .replace(/[〜~+]/g, ' ')
    .split(/\s+/)
    .forEach((part) => {
      const cleaned = part.replace(/[()（）「」]/g, '').trim();
      const metaWords = [
        '動詞', '連體形', '連用形', '未然形', '名詞', '時間名詞', '形容詞', '疑問詞',
        '格助詞', '副助詞', '助動詞', '手段', '原因', 'て形', 'ます形去掉ます', '口語常用',
      ];
      if (cleaned && !metaWords.includes(cleaned)) {
        candidates.push(cleaned);
      }
    });

  const sorted = candidates
    .filter((c) => c.length > 0 && original.includes(c))
    .sort((a, b) => b.length - a.length);

  return sorted[0] || null;
}

/**
 * 尋找單字在 original 句子中的起始位置
 */
function findVocabInOriginal(vocab: VocabItem, original: string): { start: number; length: number } | null {
  // 1. 直接全字匹配
  if (original.includes(vocab.word)) {
    return { start: original.indexOf(vocab.word), length: vocab.word.length };
  }
  // 2. 如果單字是漢字+送假名（如 分かる -> 分かった），匹配漢字部
  const kanjiMatch = vocab.word.match(/^([\u4E00-\u9FAF]+)/);
  if (kanjiMatch && original.includes(kanjiMatch[1])) {
    const start = original.indexOf(kanjiMatch[1]);
    let len = kanjiMatch[1].length;
    while (start + len < original.length && len < vocab.word.length + 1) {
      const nextChar = original[start + len];
      if (/[\u3040-\u309F]/.test(nextChar)) {
        len++;
      } else {
        break;
      }
    }
    return { start, length: len };
  }
  return null;
}

/**
 * 智慧提取單字的簡明中文核心意思 (不超過 6~7 個字)
 */
function getShortVocabMeaning(meaning: string): string {
  if (!meaning) return '';
  const clean = meaning.replace(/\([^)]*\)|（[^）]*）/g, '').trim();
  const parts = clean.split(/[,，、;；/|]/).map((s) => s.trim()).filter(Boolean);
  const first = parts[0] || clean;
  return first.length > 7 ? first.slice(0, 6) + '…' : first;
}

/**
 * 智慧提取文法句型的繁體中文核心語意標籤 (例如「表充滿/滿溢」、「動詞命令形」、「動作持續漸進」)
 */
function getShortGrammarMeaning(item: GrammarItem): string {
  if (!item) return '';

  // 1. 若 item.meaning 存在，檢查是否為有效中文語意（排除日文句型公式如「名詞＋でいっぱいだ」或純假名接續）
  if (item.meaning) {
    const m = item.meaning.trim();
    const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(m);
    const hasFormula = /[+＋〜~]/.test(m);
    const isPurePos = /^(?:名詞|動詞|形容詞|副詞|助詞)$/.test(m);
    const hasKanji = /[\u4E00-\u9FAF]/.test(m);

    if (!hasKana && !hasFormula && !isPurePos && hasKanji && m.length >= 2 && m.length <= 8) {
      return m;
    }
  }

  const p = item.pattern || '';
  const exp = item.explanation || '';

  // 2. 豐富的日語文法核心語意智能映射表 (涵蓋 N1 ~ N5 重點句型)
  // (1) 滿溢 / 充斥 / 極限程度
  if (/いっぱい|満ちる/i.test(p) || /充滿|滿溢|滿是/i.test(exp)) return '表充滿/滿溢';
  if (/きり|っきり/i.test(p) || /僅僅|只有/i.test(exp)) return '表僅僅/唯有';
  if (/切る|きれない/i.test(p) || /徹底做完|無法做完/i.test(exp)) return '徹底/做到底';
  if (/極まりない|極まる/i.test(p) || /極其|無比/i.test(exp)) return '極其/無比';
  if (/てたまらない|てたまらん/i.test(p) || /受不了|非常/i.test(exp)) return '極度/受不了';
  if (/てならない/i.test(p) || /不由得|禁不住/i.test(exp)) return '不由得/禁不住';
  if (/てしょうがない|てしかたがない/i.test(p) || /沒辦法/i.test(exp)) return '極度/無奈感';

  // (2) 傾向 / 樣態 / 推測
  if (/気味/i.test(p) || /略帶|微感/i.test(exp)) return '略帶/微感';
  if (/がち/i.test(p) || /容易|動輒/i.test(exp)) return '容易/常有傾向';
  if (/っぽい/i.test(p) || /容易顯得/i.test(exp)) return '偏向/顯得';
  if (/げ/i.test(p) && /神情|模樣/i.test(exp)) return '神情/模樣';
  if (/そうだ/i.test(p) || /樣態|傳聞/i.test(exp)) return '樣態/傳聞推測';
  if (/らしい/i.test(p)) return '推量/符合特性';
  if (/みたい/i.test(p) || /比況/i.test(exp)) return '比況/彷彿';
  if (/かもしれない/i.test(p)) return '推測 (可能/也許)';
  if (/に違いない/i.test(p) || /必定|肯定/i.test(exp)) return '必定/肯定推斷';

  // (3) 動作進行 / 時序 / 狀態變化
  if (/てゆく|ていく/i.test(p) || /ていく/i.test(exp)) return '動作持續/漸進';
  if (/てくる/i.test(p) || /持續至今|出現/i.test(exp)) return '動作由遠及近/持續至今';
  if (/ている|てる/i.test(p) || /進行|狀態/i.test(exp)) return '進行/狀態持續';
  if (/てしまう|ちゃう|じゃう/i.test(p) || /遺憾|完了/i.test(exp)) return '遺憾/完了態';
  if (/たばかり/i.test(p)) return '動作剛完成';
  if (/かけ/i.test(p) || /做了一半/i.test(exp)) return '做了一半/中途';
  if (/たて/i.test(p) || /剛出爐/i.test(exp)) return '剛完成/新鮮';
  if (/っぱなし/i.test(p) || /放任/i.test(exp)) return '放置/狀態未復原';
  if (/ながら/i.test(p)) return '並行動作 (一邊)';
  if (/てみる/i.test(p)) return '嘗試試做態';
  if (/一方/i.test(p) || /不斷持續/i.test(exp)) return '不斷惡化/持續走向';
  if (/つつある/i.test(p) || /正在逐漸/i.test(exp)) return '正在逐漸/持續';
  if (/接續|て形/i.test(p)) return '動詞て形接續';

  // (4) 動詞變化與形態
  if (/命令/i.test(p) || /命令/i.test(exp)) return '動詞命令形';
  if (/禁止/i.test(p) || /禁止/i.test(exp)) return '禁止形/禁止態';
  if (/可能/i.test(p) || /可能/i.test(exp)) return '動詞可能形';
  if (/受身|被動/i.test(p) || /受身|被動/i.test(exp)) return '受身被動態';
  if (/使役/i.test(p) || /使役/i.test(exp)) return '使役動詞態';
  if (/意向/i.test(p) || /意向/i.test(exp)) return '動詞意向形';
  if (/假定|ば形|たら|なら/i.test(p) || /假定|條件/i.test(exp)) return '假定條件句';
  if (/否定|ない/i.test(p)) return '動詞未然否定';
  if (/過去|た形/i.test(p)) return '動詞過去完了';

  // (5) 願望 / 目的 / 義務 / 許可
  if (/ように/i.test(p) || /如同|祈願|為了/i.test(exp)) return '表願望/目標';
  if (/ために/i.test(p) || /目的/i.test(exp)) return '表目的/原因';
  if (/たい|たがる/i.test(p)) return '表主觀願望';
  if (/てほしい|てもらいたい/i.test(p)) return '期望他人做某事';
  if (/なければならない/i.test(p)) return '義務 (必須/得要)';
  if (/てはいけない/i.test(p)) return '禁止 (不得/不行)';
  if (/てもいい|てもかまわない/i.test(p)) return '許可 (可以/無妨)';

  // (6) 道理 / 當然 / 必然
  if (/わけだ/i.test(p) || /怪不得|當然/i.test(exp)) return '理當如此/怪不得';
  if (/わけがない/i.test(p) || /絕不可能/i.test(exp)) return '絕不可能';
  if (/わけではない/i.test(p) || /並非/i.test(exp)) return '並非如此/不見得';
  if (/はずだ/i.test(p) || /理應/i.test(exp)) return '理應/理當如此';
  if (/べき/i.test(p) || /應當/i.test(exp)) return '應當/理應';
  if (/ものだ|もんだ/i.test(p)) return '常理/本應/感慨';
  if (/ことだ/i.test(p)) return '應當/最好';
  if (/つもり/i.test(p)) return '打算/自認';

  // (7) 限定 / 焦點 / 強調
  if (/ばかり|だけ/i.test(p)) return '限定副助詞';
  if (/のみ/i.test(p)) return '限定 (唯有/只有)';
  if (/さえ|でさえ/i.test(p)) return '極端提示 (連...都)';
  if (/こそ/i.test(p)) return '強烈強調 (正是/唯有)';
  if (/なんか|なんて/i.test(p)) return '輕視/舉例/意外';

  // (8) 轉折 / 逆接 / 對比
  if (/のに/i.test(p) || /遺憾|明明/i.test(exp)) return '逆接遺憾 (明明...卻)';
  if (/くせに/i.test(p) || /指責/i.test(exp)) return '逆接指責 (明明...卻)';
  if (/にもかかわらず/i.test(p)) return '儘管如此 (雖然...但)';
  if (/ものの|とはいうものの/i.test(p)) return '轉折 (雖然...可是)';
  if (/どころか/i.test(p) || /豈止/i.test(exp)) return '豈止/何止';
  if (/反面/i.test(p)) return '對比 (另一方面)';

  // (9) 理由 / 原因 / 歸咎
  if (/せいで|せいか/i.test(p) || /全因|歸咎/i.test(exp)) return '消極歸咎 (全因/怪)';
  if (/おかげで|おかげか/i.test(p) || /多虧/i.test(exp)) return '積極感謝 (多虧/幸虧)';
  if (/から|ので/i.test(p)) return '原因理由接續';

  // (10) 無奈 / 不得不
  if (/ざるを得ない/i.test(p)) return '不得不/別無選擇';
  if (/しかない|ほかない/i.test(p)) return '只能/別無他法';
  if (/かねない/i.test(p)) return '很有可能 (消極推測)';
  if (/かねる/i.test(p)) return '難以做到 (委婉拒絕)';
  if (/がたい/i.test(p)) return '難以/不易';

  // (11) 評價 / 價值
  if (/甲斐/i.test(p)) return '價值/不枉費';
  if (/にすぎない/i.test(p)) return '只不過是/僅僅';
  if (/にほかならない/i.test(p)) return '無非是/正是';

  // (12) 助詞用法
  if (/助詞「に」|に用法/i.test(p) || /格助詞「に」/i.test(exp)) return '格助詞 (對象/著落)';
  if (/助詞「で」|で用法/i.test(p) || /格助詞「で」/i.test(exp)) return '格助詞 (場所/手段)';
  if (/助詞「を」|を用法/i.test(p) || /格助詞「を」/i.test(exp)) return '格助詞 (受詞/通過)';
  if (/助詞「と」|と用法/i.test(p)) return '格助詞 (共同/引述)';
  if (/助詞「から」/i.test(p)) return '格助詞 (起點/原因)';
  if (/助詞「まで」/i.test(p)) return '副助詞 (終點/極限)';
  if (/助詞「は」/i.test(p)) return '係助詞 (主題/對比)';
  if (/助詞「が」/i.test(p)) return '格助詞 (主語/逆接)';
  if (/助詞「も」/i.test(p)) return '副助詞 (同類添加)';

  // (13) 術語模式匹配（如動詞過去形、受身態）
  const termMatch = p.match(/[\u4E00-\u9FAF]{2,6}(?:形|態|句|用法|助詞|助動詞)/);
  if (termMatch && !/名詞|動詞$/.test(termMatch[0])) {
    return termMatch[0];
  }

  // (14) 從說明文字中智慧截取「表...」或「表示...」
  const expressMatch = exp.match(/(?:表|表示|用於說明|意為|指)([^，。、\s「」]{2,6})/);
  if (expressMatch && /[\u4E00-\u9FAF]/.test(expressMatch[1]) && !/[+＋]/.test(expressMatch[1])) {
    return `表${expressMatch[1]}`;
  }

  // (15) 從說明引號中提取
  const quotes = exp.match(/「([^」]+)」/g);
  if (quotes) {
    for (const q of quotes) {
      const content = q.slice(1, -1).trim();
      if (/[\u4E00-\u9FAF]/.test(content) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(content) && content.length >= 2 && content.length <= 6) {
        return content;
      }
    }
  }

  return '文法意涵';
}

interface VocabSubUnit {
  oText: string;
  fText: string;
  vocab?: { item: VocabItem; index: number };
}

interface GrammarDisplayUnit {
  type: 'grammar';
  oText: string;
  fText: string;
  grammar: { item: GrammarItem; index: number };
  subUnits: VocabSubUnit[];
}

interface PlainDisplayUnit {
  type: 'plain';
  oText: string;
  fText: string;
  vocab?: { item: VocabItem; index: number };
}

type DisplayUnit = GrammarDisplayUnit | PlainDisplayUnit;

export const GrammarAnnotatedSentence: React.FC<GrammarAnnotatedSentenceProps> = ({
  furigana,
  original,
  grammar = [],
  vocabulary = [],
  mode = 'show',
  activeGrammarIndex = null,
  activeVocabIndex = null,
  onSelectGrammar,
  onSelectVocab,
  showAnnotations = true,
  translationSlot,
}) => {
  const [hoveredGrammarIdx, setHoveredGrammarIdx] = useState<number | null>(null);
  const [hoveredVocabIdx, setHoveredVocabIdx] = useState<number | null>(null);

  // 解析所有文法點與單字在句子中的位置區間 (同一文法點合併為單一連貫區間，絕不重複多畫線)
  const { displayUnits, grammarPills } = useMemo(() => {
    const map = buildOrigToFuriganaMap(original, furigana);
    if (map.length === 0 || original.length === 0) {
      return {
        displayUnits: [{ type: 'plain', oText: original, fText: furigana }] as DisplayUnit[],
        grammarPills: [],
      };
    }

    interface CharAnnotation {
      grammar?: { item: GrammarItem; index: number };
      vocab?: { item: VocabItem; index: number };
    }

    const charMarks: CharAnnotation[] = Array.from({ length: original.length }, () => ({}));

    // 1. 標記文法區間
    if (showAnnotations) {
      grammar.forEach((item, gIdx) => {
        const target = item.target || findTargetInOriginal(item, original);
        if (target && original.includes(target)) {
          let start = original.indexOf(target);
          while (start !== -1) {
            const end = start + target.length;
            for (let i = start; i < end; i++) {
              if (!charMarks[i].grammar) {
                charMarks[i].grammar = { item, index: gIdx };
              }
            }
            start = original.indexOf(target, end);
          }
        }
      });
    }

    // 2. 標記單字區間 (支援同句多次出現、活用變化，並嚴格避免侵入文法邊界)
    vocabulary.forEach((item, vIdx) => {
      const matchWords = [item.word];
      if (item.baseForm && item.baseForm !== item.word) {
        matchWords.push(item.baseForm);
      }
      const kanjiMatch = item.word.match(/^([\u4E00-\u9FAF]+)/);
      const kanjiBase = kanjiMatch ? kanjiMatch[1] : null;

      matchWords.forEach((w) => {
        if (!w) return;
        let start = original.indexOf(w);
        while (start !== -1) {
          let actualLen = w.length;
          // 若起點不在文法內，截斷侵入後方文法區間的假名 (例如 溶け + てゆく，防止 溶けて 侵入 て)
          if (!charMarks[start].grammar) {
            while (actualLen > 1 && charMarks[start + actualLen - 1].grammar) {
              actualLen--;
            }
          }
          for (let i = start; i < start + actualLen; i++) {
            if (!charMarks[i].vocab) {
              charMarks[i].vocab = { item, index: vIdx };
            }
          }
          start = original.indexOf(w, start + w.length);
        }
      });

      // 處理動詞/形容詞活用變形（如 溶ける -> 溶け）
      if (kanjiBase && original.includes(kanjiBase)) {
        let start = original.indexOf(kanjiBase);
        while (start !== -1) {
          if (!charMarks[start].vocab) {
            let len = kanjiBase.length;
            while (start + len < original.length && len < item.word.length + 1) {
              const nextChar = original[start + len];
              if (/[\u3040-\u309F]/.test(nextChar)) {
                len++;
              } else {
                break;
              }
            }
            if (!charMarks[start].grammar) {
              while (len > kanjiBase.length && charMarks[start + len - 1].grammar) {
                len--;
              }
            }
            for (let i = start; i < start + len; i++) {
              if (!charMarks[i].vocab) {
                charMarks[i].vocab = { item, index: vIdx };
              }
            }
          }
          start = original.indexOf(kanjiBase, start + 1);
        }
      }
    });

    // 3. 第一層：依「文法點 (gIdx)」切分大區塊，同一文法點 100% 保持連貫為一個群組，絕不被單字切碎！
    interface GrammarBlock {
      type: 'grammar' | 'plain';
      start: number;
      end: number;
      grammar?: { item: GrammarItem; index: number };
    }

    const grammarBlocks: GrammarBlock[] = [];
    let bStart = 0;

    for (let i = 1; i <= original.length; i++) {
      const prevG = charMarks[i - 1].grammar?.index;
      const currG = i < original.length ? charMarks[i].grammar?.index : undefined;
      const isSame = i < original.length && prevG === currG;

      if (!isSame) {
        grammarBlocks.push({
          type: prevG !== undefined ? 'grammar' : 'plain',
          start: bStart,
          end: i,
          grammar: charMarks[bStart].grammar,
        });
        bStart = i;
      }
    }

    // 4. 第二層：建構 DisplayUnits (文法區間內包含多個單字子項目，非文法區間依單字展開)
    const resultUnits: DisplayUnit[] = [];

    grammarBlocks.forEach((block) => {
      const bFStart = map[block.start]?.fStart ?? 0;
      const bFEnd = map[block.end - 1]?.fEnd ?? furigana.length;
      const bOText = original.slice(block.start, block.end);
      const bFText = furigana.slice(bFStart, bFEnd);

      if (block.type === 'grammar' && block.grammar) {
        const subUnits: VocabSubUnit[] = [];
        let sStart = block.start;

        for (let j = block.start + 1; j <= block.end; j++) {
          const prevV = charMarks[j - 1].vocab?.index;
          const currV = j < block.end ? charMarks[j].vocab?.index : undefined;
          if (j === block.end || prevV !== currV) {
            const subFStart = map[sStart]?.fStart ?? 0;
            const subFEnd = map[j - 1]?.fEnd ?? furigana.length;
            subUnits.push({
              oText: original.slice(sStart, j),
              fText: furigana.slice(subFStart, subFEnd),
              vocab: charMarks[sStart].vocab,
            });
            sStart = j;
          }
        }

        resultUnits.push({
          type: 'grammar',
          oText: bOText,
          fText: bFText,
          grammar: block.grammar,
          subUnits,
        });
      } else {
        let sStart = block.start;
        for (let j = block.start + 1; j <= block.end; j++) {
          const prevV = charMarks[j - 1].vocab?.index;
          const currV = j < block.end ? charMarks[j].vocab?.index : undefined;
          if (j === block.end || prevV !== currV) {
            const subFStart = map[sStart]?.fStart ?? 0;
            const subFEnd = map[j - 1]?.fEnd ?? furigana.length;
            resultUnits.push({
              type: 'plain',
              oText: original.slice(sStart, j),
              fText: furigana.slice(subFStart, subFEnd),
              vocab: charMarks[sStart].vocab,
            });
            sStart = j;
          }
        }
      }
    });

    // 提取文法導覽 pills
    const pillsMap = new Map<number, { gramIndex: number; targetText: string; pattern: string; explanation: string }>();
    grammar.forEach((item, gIdx) => {
      const target = item.target || findTargetInOriginal(item, original);
      if (target && original.includes(target) && !pillsMap.has(gIdx)) {
        pillsMap.set(gIdx, {
          gramIndex: gIdx,
          targetText: target,
          pattern: item.pattern,
          explanation: item.explanation,
        });
      }
    });

    return { displayUnits: resultUnits, grammarPills: Array.from(pillsMap.values()) };
  }, [furigana, original, grammar, vocabulary, showAnnotations]);

  return (
    <div className="space-y-2.5">
      {/* 主歌詞句子（詞語之間保留優雅空格間距，絕不緊密黏在一起） */}
      <div className="text-xl sm:text-2xl font-bold tracking-wide text-white leading-relaxed flex flex-wrap items-start gap-y-4 gap-x-3 sm:gap-x-4 pt-1">
        {displayUnits.map((unit, uIdx) => {
          // A. 非文法單元 (純文字 或 純單字)
          if (unit.type === 'plain') {
            const hasVocab = Boolean(unit.vocab);
            const vocab = unit.vocab?.item;
            const shortVocab = hasVocab ? getShortVocabMeaning(vocab!.meaning) : '';
            const isVocActive =
              hasVocab && (activeVocabIndex === unit.vocab!.index || hoveredVocabIdx === unit.vocab!.index);
            const jlptStyle =
              vocab?.jlpt && JLPT_BADGES[vocab.jlpt] ? JLPT_BADGES[vocab.jlpt] : 'bg-slate-800 text-slate-300 border-slate-700';

            if (!hasVocab) {
              return (
                <span key={`plain-txt-${uIdx}`} className="inline-flex flex-col items-center">
                  <span className="h-[50px] sm:h-[56px] flex items-end justify-center pb-1">
                    <RubyText text={unit.fText} original={unit.oText} mode={mode} />
                  </span>
                  <span className="h-[22px] mt-1.5 invisible select-none pointer-events-none">&nbsp;</span>
                </span>
              );
            }

            return (
              <span
                key={`plain-vocab-${uIdx}`}
                onMouseLeave={() => setHoveredVocabIdx(null)}
                className="relative group inline-flex flex-col items-center mx-0.5 select-none"
              >
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectVocab?.(unit.vocab!.index);
                  }}
                  onMouseEnter={() => setHoveredVocabIdx(unit.vocab!.index)}
                  className={`h-[50px] sm:h-[56px] flex items-end justify-center px-1.5 pb-1 transition-all duration-200 relative cursor-pointer border-b-2 border-dashed border-cyan-400 ${
                    isVocActive ? '-translate-y-0.5' : 'hover:-translate-y-0.5'
                  }`}
                >
                  <RubyText text={unit.fText} original={unit.oText} mode={mode} />
                </span>

                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectVocab?.(unit.vocab!.index);
                  }}
                  onMouseEnter={() => setHoveredVocabIdx(unit.vocab!.index)}
                  className={`h-[22px] flex items-center justify-center text-[10px] sm:text-[11px] font-sans font-semibold text-cyan-300 leading-none tracking-normal px-1.5 mt-1.5 rounded-md border transition shadow-sm cursor-pointer select-none backdrop-blur-sm ${
                    isVocActive
                      ? 'bg-cyan-500/25 border-cyan-400 ring-1 ring-cyan-400/50 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                      : 'bg-cyan-500/15 border-cyan-500/35 hover:bg-cyan-500/25 hover:border-cyan-400'
                  }`}
                >
                  {shortVocab}
                </span>

                {/* 單字 Tooltip */}
                {isVocActive && vocab && (
                  <SmartTooltip borderClass="border-cyan-500/50 ring-1 ring-cyan-500/20">
                    <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800/60">
                      <span className="font-bold text-white text-base block tracking-wide">
                        <VocabRubyText word={vocab.word} reading={vocab.reading} />
                      </span>
                      <div className="flex items-center gap-1.5">
                        {vocab.jlpt && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${jlptStyle}`}>
                            {vocab.jlpt}
                          </span>
                        )}
                        <span className="text-[10px] text-cyan-300 bg-cyan-500/15 border border-cyan-500/40 px-2 py-0.5 rounded-full font-mono font-bold shadow-sm backdrop-blur-sm">
                          #{unit.vocab!.index + 1} 單字
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {vocab.pos && (
                        <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-500/15 border border-cyan-500/35 px-2 py-0.5 rounded-md shadow-sm">
                          {vocab.pos}
                        </span>
                      )}
                      {vocab.conjugation && vocab.conjugation !== '無活用' && (
                        <span className="text-[10px] font-medium text-amber-300 bg-amber-500/15 border border-amber-500/35 px-2 py-0.5 rounded-md shadow-sm">
                          活用：{vocab.conjugation}
                        </span>
                      )}
                      {vocab.baseForm && vocab.baseForm !== vocab.word && (
                        <span className="text-[10px] text-slate-300 bg-slate-900 border border-slate-700/70 px-2 py-0.5 rounded-md">
                          原形：<span className="text-white font-medium">{vocab.baseForm}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-200 font-medium leading-relaxed bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
                      <span className="text-slate-400 text-[10px] block mb-0.5 font-semibold">單字釋義</span>
                      {vocab.meaning}
                    </p>
                  </SmartTooltip>
                )}
              </span>
            );
          }

          // B. 文法單元
          const gIdx = unit.grammar.index;
          const color = GRAMMAR_COLORS[gIdx % GRAMMAR_COLORS.length];
          const shortGrammar = getShortGrammarMeaning(unit.grammar.item);
          const isGramActive = activeGrammarIndex === gIdx || hoveredGrammarIdx === gIdx;
          const hasAnySubVocab = unit.subUnits.some((s) => Boolean(s.vocab));

          // 情況 1：純文法單元 (無包含單字，如「ように」、「てゆく」)
          // 劃線與標籤高度完全與純單字對齊在同一個水平面上 (h-[50px] 文字容器底線 + h-[22px] mt-1.5 標籤)
          if (!hasAnySubVocab) {
            return (
              <span
                key={`gram-group-${uIdx}`}
                onMouseLeave={() => {
                  setHoveredGrammarIdx(null);
                  setHoveredVocabIdx(null);
                }}
                className="relative group inline-flex flex-col items-center mx-0.5 select-none"
              >
                {/* 文法序號微型角標 */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGrammar?.(gIdx);
                  }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    setHoveredGrammarIdx(gIdx);
                    setHoveredVocabIdx(null);
                  }}
                  className={`absolute top-0 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold leading-none cursor-pointer transition-all duration-200 z-10 shadow-sm ${
                    isGramActive
                      ? `${color.badge} scale-105 opacity-100`
                      : `${color.badgeMuted} opacity-85 hover:opacity-100 hover:scale-105`
                  }`}
                >
                  #{gIdx + 1}
                </span>

                {/* 文字容器 */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGrammar?.(gIdx);
                  }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    setHoveredGrammarIdx(gIdx);
                    setHoveredVocabIdx(null);
                  }}
                  className={`h-[50px] sm:h-[56px] flex items-end justify-center px-1.5 pb-1 transition-all duration-200 relative cursor-pointer ${
                    isGramActive ? '-translate-y-0.5' : 'hover:-translate-y-0.5'
                  }`}
                >
                  <RubyText text={unit.fText} original={unit.oText} mode={mode} />
                </span>

                {/* 凹字形文法標註括號線 |_______| */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGrammar?.(gIdx);
                  }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    setHoveredGrammarIdx(gIdx);
                    setHoveredVocabIdx(null);
                  }}
                  className={`w-full h-1.5 sm:h-2 mt-1 border-b-[2.5px] border-l-2 border-r-2 rounded-b-[2px] cursor-pointer transition-all ${
                    isGramActive ? color.activeBracket : `${color.bracket} hover:border-amber-300`
                  }`}
                ></span>

                {/* 文法句型公式與核心意涵標籤 (補充顯示如: [動詞連體形＋より（も）] [比較基準]) */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGrammar?.(gIdx);
                  }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    setHoveredGrammarIdx(gIdx);
                    setHoveredVocabIdx(null);
                  }}
                  className="flex flex-wrap items-center justify-center gap-1.5 mt-1 cursor-pointer"
                >
                  {/* 1. 核心中文意涵標籤 (優先展示核心理解，如: 滿溢狀態、逆接讓步) */}
                  {shortGrammar && (
                    <span
                      className={`h-[22px] flex items-center justify-center text-[10px] sm:text-[11px] font-sans font-bold leading-none tracking-normal px-2 rounded-md border shadow-sm transition select-none whitespace-nowrap ${
                        isGramActive ? color.activeCapsule : color.capsule
                      }`}
                    >
                      {shortGrammar}
                    </span>
                  )}

                  {/* 2. 句型接續公式 (輔助說明接續方式，如: 名詞＋でいっぱいだ) */}
                  {unit.grammar.item.pattern && unit.grammar.item.pattern !== shortGrammar && (
                    <span
                      className={`h-[22px] flex items-center justify-center text-[10px] sm:text-[11px] font-mono font-medium leading-none tracking-tight px-2 rounded-md border shadow-sm transition select-none whitespace-nowrap ${color.meaningCapsule}`}
                    >
                      {unit.grammar.item.pattern}
                    </span>
                  )}
                </div>

                {/* 整個文法點的 Tooltip */}
                {isGramActive && (
                  <SmartTooltip borderClass={`${color.tooltipBorder} ring-1 ${color.border}`}>
                    <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800/80">
                      <span className={`flex items-center gap-1.5 text-xs font-bold ${color.titleText}`}>
                        <span className={`w-2 h-2 rounded-full ${color.dot} shrink-0`}></span>
                        <span>文法點 #{gIdx + 1}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {unit.grammar.item.jlpt && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${JLPT_BADGES[unit.grammar.item.jlpt] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                            {unit.grammar.item.jlpt}
                          </span>
                        )}
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 border ${color.border} font-bold ${color.titleText}`}>
                          {unit.grammar.item.pattern}
                        </span>
                      </div>
                    </div>

                    <div className={`text-[11px] font-semibold mb-2 flex items-center gap-1.5 p-1.5 rounded-lg border ${color.meaningCapsule}`}>
                      <span>💡 文法意涵：</span>
                      <span className="font-bold">{shortGrammar}</span>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed font-normal bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
                      {unit.grammar.item.explanation}
                    </p>
                  </SmartTooltip>
                )}
              </span>
            );
          }

          // 情況 2：複合單元 (文法內包含單字，如「やめろ」同時有單字「やめる」與文法「動詞命令形」)
          // 頂層 flex 採用 items-start，每個文字容器固定 h-[50px] sm:h-[56px] items-end，無標籤子單元加上 invisible 佔位，絕不跑位掉落！
          return (
            <span
              key={`gram-group-${uIdx}`}
              onMouseLeave={() => {
                setHoveredGrammarIdx(null);
                setHoveredVocabIdx(null);
              }}
              className="relative group inline-flex flex-col items-center mx-0.5 select-none"
            >
              {/* 文法序號微型角標 */}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGrammar?.(gIdx);
                }}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  setHoveredGrammarIdx(gIdx);
                  setHoveredVocabIdx(null);
                }}
                className={`absolute top-0 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold leading-none cursor-pointer transition-all duration-200 z-10 shadow-sm ${
                  isGramActive
                    ? `${color.badge} scale-105 opacity-100`
                    : `${color.badgeMuted} opacity-85 hover:opacity-100 hover:scale-105`
                }`}
              >
                #{gIdx + 1}
              </span>

              {/* 第一層：該文法涵蓋的所有文字／單字子項目 (加上 gap-x-2.5 sm:gap-x-3.5 形成清晰詞語間隔，絕不連在一起) */}
              <div className="flex items-start justify-center gap-x-2.5 sm:gap-x-3.5">
                {unit.subUnits.map((sub, sIdx) => {
                  const hasSubVocab = Boolean(sub.vocab);
                  const subVocab = sub.vocab?.item;
                  const shortSubVocab = hasSubVocab ? getShortVocabMeaning(subVocab!.meaning) : '';
                  const isSubVocActive =
                    hasSubVocab && (activeVocabIndex === sub.vocab!.index || hoveredVocabIdx === sub.vocab!.index);
                  const jlptStyle =
                    subVocab?.jlpt && JLPT_BADGES[subVocab.jlpt] ? JLPT_BADGES[subVocab.jlpt] : 'bg-slate-800 text-slate-300 border-slate-700';

                  return (
                    <span key={`sub-${sIdx}`} className="relative inline-flex flex-col items-center">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasSubVocab) onSelectVocab?.(sub.vocab!.index);
                          else onSelectGrammar?.(gIdx);
                        }}
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          if (hasSubVocab) {
                            setHoveredVocabIdx(sub.vocab!.index);
                            setHoveredGrammarIdx(null);
                          } else {
                            setHoveredGrammarIdx(gIdx);
                            setHoveredVocabIdx(null);
                          }
                        }}
                        className={`h-[50px] sm:h-[56px] flex items-end justify-center px-1 pb-1 transition-all duration-200 relative cursor-pointer ${
                          hasSubVocab
                            ? `border-b-2 border-dashed border-cyan-400 ${isSubVocActive ? '-translate-y-0.5' : 'hover:-translate-y-0.5'}`
                            : ''
                        }`}
                      >
                        <RubyText text={sub.fText} original={sub.oText} mode={mode} />
                      </span>

                      {/* 若有單字意思，顯示單字意思膠囊；若無，顯示隱形佔位維持垂直對齊 */}
                      {hasSubVocab ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectVocab?.(sub.vocab!.index);
                          }}
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            setHoveredVocabIdx(sub.vocab!.index);
                            setHoveredGrammarIdx(null);
                          }}
                          className={`h-[22px] flex items-center justify-center text-[10px] sm:text-[11px] font-sans font-semibold text-cyan-300 leading-none tracking-normal px-1.5 mt-1.5 rounded-md border transition shadow-sm cursor-pointer select-none backdrop-blur-sm ${
                            isSubVocActive
                              ? 'bg-cyan-500/25 border-cyan-400 ring-1 ring-cyan-400/50 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                              : 'bg-cyan-500/15 border-cyan-500/35 hover:bg-cyan-500/25 hover:border-cyan-400'
                          }`}
                        >
                          {shortSubVocab}
                        </span>
                      ) : (
                        <span className="h-[22px] mt-1.5 invisible select-none pointer-events-none">&nbsp;</span>
                      )}

                      {/* 子單字 Tooltip */}
                      {isSubVocActive && subVocab && (
                        <SmartTooltip borderClass="border-cyan-500/50 ring-1 ring-cyan-500/20">
                          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800/60">
                            <span className="font-bold text-white text-base block tracking-wide">
                              <VocabRubyText word={subVocab.word} reading={subVocab.reading} />
                            </span>
                            <div className="flex items-center gap-1.5">
                              {subVocab.jlpt && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${jlptStyle}`}>
                                  {subVocab.jlpt}
                                </span>
                              )}
                              <span className="text-[10px] text-cyan-300 bg-cyan-500/15 border border-cyan-500/40 px-2 py-0.5 rounded-full font-mono font-bold shadow-sm backdrop-blur-sm">
                                #{sub.vocab!.index + 1} 單字
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            {subVocab.pos && (
                              <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-500/15 border border-cyan-500/35 px-2 py-0.5 rounded-md shadow-sm">
                                {subVocab.pos}
                              </span>
                            )}
                            {subVocab.conjugation && subVocab.conjugation !== '無活用' && (
                              <span className="text-[10px] font-medium text-amber-300 bg-amber-500/15 border border-amber-500/35 px-2 py-0.5 rounded-md shadow-sm">
                                活用：{subVocab.conjugation}
                              </span>
                            )}
                            {subVocab.baseForm && subVocab.baseForm !== subVocab.word && (
                              <span className="text-[10px] text-slate-300 bg-slate-900 border border-slate-700/70 px-2 py-0.5 rounded-md">
                                原形：<span className="text-white font-medium">{subVocab.baseForm}</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-200 font-medium leading-relaxed bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
                            <span className="text-slate-400 text-[10px] block mb-0.5 font-semibold">單字釋義</span>
                            {subVocab.meaning}
                          </p>
                        </SmartTooltip>
                      )}
                    </span>
                  );
                })}
              </div>

              {/* 第二層：凹字形文法標註括號線 |_______| (左右帶有立起角線，整段包覆上方詞彙) */}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGrammar?.(gIdx);
                }}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  setHoveredGrammarIdx(gIdx);
                  setHoveredVocabIdx(null);
                }}
                className={`w-full h-2 sm:h-2.5 mt-2 border-b-[2.5px] border-l-2 border-r-2 rounded-b-[2px] cursor-pointer transition-all ${
                  isGramActive ? color.activeBracket : `${color.bracket} hover:border-amber-300`
                }`}
              ></span>

              {/* 第二層：文法句型公式與核心意涵雙標籤 (補充顯示如: [動詞連體形＋より（も）] [比較基準]) */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGrammar?.(gIdx);
                }}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  setHoveredGrammarIdx(gIdx);
                  setHoveredVocabIdx(null);
                }}
                className="flex flex-wrap items-center justify-center gap-1.5 mt-1 cursor-pointer"
              >
                {/* 1. 核心中文意涵標籤 (優先展示核心理解，如: 滿溢狀態、逆接讓步) */}
                {shortGrammar && (
                  <span
                    className={`h-[22px] flex items-center justify-center text-[10px] sm:text-[11px] font-sans font-bold leading-none tracking-normal px-2 rounded-md border shadow-sm transition select-none whitespace-nowrap ${
                      isGramActive ? color.activeCapsule : color.capsule
                    }`}
                  >
                    {shortGrammar}
                  </span>
                )}

                {/* 2. 句型接續公式 (輔助說明接續方式，如: 名詞＋でいっぱいだ) */}
                {unit.grammar.item.pattern && unit.grammar.item.pattern !== shortGrammar && (
                  <span
                    className={`h-[22px] flex items-center justify-center text-[10px] sm:text-[11px] font-mono font-medium leading-none tracking-tight px-2 rounded-md border shadow-sm transition select-none whitespace-nowrap ${color.meaningCapsule}`}
                  >
                    {unit.grammar.item.pattern}
                  </span>
                )}
              </div>

              {/* 整個文法點的 Tooltip */}
              {isGramActive && (
                <SmartTooltip borderClass={`${color.tooltipBorder} ring-1 ${color.border}`}>
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800/80">
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${color.titleText}`}>
                      <span className={`w-2 h-2 rounded-full ${color.dot} shrink-0`}></span>
                      <span>文法點 #{gIdx + 1}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {unit.grammar.item.jlpt && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${JLPT_BADGES[unit.grammar.item.jlpt] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                          {unit.grammar.item.jlpt}
                        </span>
                      )}
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 border ${color.border} font-bold ${color.titleText}`}>
                        {unit.grammar.item.pattern}
                      </span>
                    </div>
                  </div>

                  <div className={`text-[11px] font-semibold mb-2 flex items-center gap-1.5 p-1.5 rounded-lg border ${color.meaningCapsule}`}>
                    <span>💡 文法意涵：</span>
                    <span className="font-bold">{shortGrammar}</span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-normal bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
                    {unit.grammar.item.explanation}
                  </p>
                </SmartTooltip>
              )}
            </span>
          );
        })}
      </div>

      {/* 緊貼日文句子正下方的中文翻譯區塊 (自然直覺，免除視線跳轉) */}
      {translationSlot}

      {/* 句子下方：句中文法對照快捷標籤 (Quick Pills) */}
      {grammarPills.length > 0 && showAnnotations && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>句中文法導覽：</span>
          </span>
          {grammarPills.map((pill) => {
            const color = GRAMMAR_COLORS[pill.gramIndex % GRAMMAR_COLORS.length];
            const isActive =
              activeGrammarIndex === pill.gramIndex || hoveredGrammarIdx === pill.gramIndex;
            return (
              <button
                key={`pill-${pill.gramIndex}`}
                type="button"
                onClick={() => onSelectGrammar?.(pill.gramIndex)}
                onMouseEnter={() => setHoveredGrammarIdx(pill.gramIndex)}
                onMouseLeave={() => setHoveredGrammarIdx(null)}
                className={`text-[11px] px-3 py-1 rounded-full border transition-all duration-200 flex items-center gap-1.5 shadow-sm ${
                  isActive
                    ? `${color.activeBg} ${color.border} font-bold text-white -translate-y-0.5`
                    : `bg-slate-950/70 ${color.border} text-slate-300 hover:text-white hover:${color.bg} hover:-translate-y-0.5`
                }`}
                title={pill.explanation}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`}></span>
                <span className="font-mono text-[10px] font-bold opacity-80">#{pill.gramIndex + 1}</span>
                <span className="font-medium text-white">{pill.targetText}</span>
                <span className="text-slate-400 text-[10px] font-normal hidden sm:inline">
                  ({pill.pattern.split('+')[0].trim().slice(0, 10)})
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
