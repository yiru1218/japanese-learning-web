import React from 'react';
import { FuriganaMode } from '@/types';

interface RubyTextProps {
  text: string;
  original?: string;
  mode?: FuriganaMode;
  className?: string;
  rubyClassName?: string;
  rtClassName?: string;
}

/**
 * 智慧剝離 AI 誤將送假名 (Okurigana) 包進括號的情況
 * 例如：散[ちった] -> 散[ち] + った
 */
function peelOkurigana(
  kanji: string,
  furigana: string,
  original?: string
): { kanji: string; furigana: string; trailing: string } {
  // 如果 kanji 純為漢字，且 furigana 結尾有常見送假名
  const isKanji = /^[\u4E00-\u9FAF]+$/.test(kanji);
  if (isKanji && furigana.length > 1) {
    const okuriganaPatterns = [
      'った', 'って', 'ない', 'ます', 'れば', 'よう', 'いた', 'いて', 'んだ', 'んで',
      'る', 'た', 'て', 'う', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む', 'い', 'き', 'し'
    ];
    for (const suffix of okuriganaPatterns) {
      if (furigana.endsWith(suffix) && furigana.length > suffix.length) {
        if (original) {
          const idx = original.indexOf(kanji);
          if (idx !== -1 && original.slice(idx + kanji.length).startsWith(suffix)) {
            return {
              kanji,
              furigana: furigana.slice(0, -suffix.length),
              trailing: suffix,
            };
          }
        } else if (suffix.length >= 2) {
          return {
            kanji,
            furigana: furigana.slice(0, -suffix.length),
            trailing: suffix,
          };
        }
      }
    }
  }
  return { kanji, furigana, trailing: '' };
}

/**
 * 將格式如 "沈[しず]むように溶[と]けてゆく" 的文字轉為原生 HTML5 <ruby><rt> 假名標籤
 * 採用原生標準排版引擎，完美維持與周圍平假名的文字基線 (Baseline) 對齊
 */
export const RubyText: React.FC<RubyTextProps> = ({
  text,
  original,
  mode = 'show',
  className = '',
  rubyClassName = '',
  rtClassName = '',
}) => {
  if (!text) return null;

  // 正確匹配緊接在 [假名] 前方的漢字/詞彙，絕不貪婪吞噬前方的平假名！
  const regex = /([\u4E00-\u9FAF\u3400-\u4DBF々ヶ〆\u30A0-\u30FFA-Za-z0-9]+)\[([^\[\]]+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // 1. 若該漢字前方有普通文字（如「むように」），先輸出為正常文字！
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${keyIndex++}`}>{text.slice(lastIndex, match.index)}</span>
      );
    }

    const rawKanji = match[1];
    const rawFurigana = match[2];
    const { kanji, furigana, trailing } = peelOkurigana(rawKanji, rawFurigana, original);

    // 2. 輸出原生 ruby 標籤（假名精確居中置於漢字正上方）
    parts.push(
      <ruby
        key={`ruby-${keyIndex++}`}
        className={`group/ruby [ruby-align:center] [ruby-position:over] ${rubyClassName}`}
      >
        {kanji}
        <rt
          className={`text-[0.55em] font-medium leading-none text-indigo-400 select-none transition-opacity duration-150 ${
            mode === 'hide'
              ? 'opacity-0'
              : mode === 'hover'
              ? 'opacity-0 group-hover/ruby:opacity-100'
              : 'opacity-100'
          } ${rtClassName}`}
        >
          {furigana}
        </rt>
      </ruby>
    );

    if (trailing) {
      parts.push(<span key={`trailing-${keyIndex++}`}>{trailing}</span>);
    }

    lastIndex = match.index + match[0].length;
  }

  // 3. 處理句尾剩下的普通文字
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${keyIndex++}`}>{text.slice(lastIndex)}</span>);
  }

  return (
    <span
      className={`inline-block font-sans leading-relaxed tracking-normal [ruby-align:center] ${className}`}
    >
      {parts}
    </span>
  );
};

/**
 * 專門用於單字卡片的平假名注音排版（將假名精準標註在漢字上方，送假名正常平鋪）
 * 例如：
 *  word: "笑ってしまう", reading: "わらってしまう" -> <ruby>笑<rt>わら</rt></ruby>ってしまう
 *  word: "無惨", reading: "むざん" -> <ruby>無惨<rt>むざん</rt></ruby>
 *  word: "砕けて", reading: "くだけて" -> <ruby>砕<rt>くだ</rt></ruby>けて
 *  word: "散った", reading: "ちった" -> <ruby>散<rt>ち</rt></ruby>った
 *  word: "ほど", reading: "ほど" -> ほど
 */
export const VocabRubyText: React.FC<{
  word: string;
  reading?: string;
  className?: string;
  rtClassName?: string;
}> = ({ word, reading, className = '', rtClassName = '' }) => {
  if (!word) return null;
  if (!reading || word === reading) {
    return <span className={className}>{word}</span>;
  }

  const hasKanji = /[\u4E00-\u9FAF]/.test(word);
  if (!hasKanji) {
    return <span className={className}>{word}</span>;
  }

  // 1. 純漢字（如：無惨 -> むざん）
  const isPureKanji = /^[\u4E00-\u9FAF]+$/.test(word);
  if (isPureKanji) {
    return (
      <ruby className={`[ruby-align:center] [ruby-position:over] ${className}`}>
        {word}
        <rt className={`text-[0.6em] font-medium leading-none text-indigo-400 select-none ${rtClassName}`}>
          {reading}
        </rt>
      </ruby>
    );
  }

  // 2. 漢字 + 送假名混合（如：笑ってしまう -> わらってしまう）
  let prefixLen = 0;
  while (
    prefixLen < word.length &&
    prefixLen < reading.length &&
    word[prefixLen] === reading[prefixLen]
  ) {
    prefixLen++;
  }

  let suffixLen = 0;
  while (
    suffixLen < word.length - prefixLen &&
    suffixLen < reading.length - prefixLen &&
    word[word.length - 1 - suffixLen] === reading[reading.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const prefix = word.slice(0, prefixLen);
  const suffix = suffixLen > 0 ? word.slice(-suffixLen) : '';
  const midKanji = word.slice(prefixLen, word.length - suffixLen);
  const midFurigana = reading.slice(prefixLen, reading.length - suffixLen);

  return (
    <span className={`inline-block font-sans [ruby-align:center] leading-relaxed ${className}`}>
      {prefix && <span>{prefix}</span>}
      <ruby className="[ruby-align:center] [ruby-position:over]">
        {midKanji}
        <rt className={`text-[0.6em] font-medium leading-none text-indigo-400 select-none ${rtClassName}`}>
          {midFurigana}
        </rt>
      </ruby>
      {suffix && <span>{suffix}</span>}
    </span>
  );
};
