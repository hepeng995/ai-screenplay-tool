/**
 * 章节切分工具
 * T2.2: 自动识别小说章节边界
 */

export interface Chapter {
  index: number;
  title: string;
  content: string;
  charCount: number;
}

export interface SplitResult {
  success: boolean;
  chapters: Chapter[];
  totalChapters: number;
  message?: string;
}

/**
 * 章节标题正则（按优先级排列）
 * 1. 中文格式：第一章 / 第1章 / 第一节 / 第一回 / 第一卷
 * 2. 英文格式：Chapter 1 / CHAPTER I
 */
const CHAPTER_REGEX = /(?:第[一二三四五六七八九十百千零〇\d]+[章节回卷]|Chapter\s+\d+|CHAPTER\s+[IVX]+)/gi;

/**
 * 切分小说文本为章节
 * @param text 完整小说文本
 * @returns 切分结果
 */
export function splitChapters(text: string): SplitResult {
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      chapters: [],
      totalChapters: 0,
      message: '文本为空',
    };
  }

  // 查找所有章节标题位置
  const matches: { index: number; title: string }[] = [];
  let m: RegExpExecArray | null;
  const regex = new RegExp(CHAPTER_REGEX.source, 'gi');
  while ((m = regex.exec(text)) !== null) {
    matches.push({ index: m.index, title: m[0].trim() });
  }

  // 切分点不足
  if (matches.length < 3) {
    // 兜底：尝试更宽松的匹配（独立行 + 冒号）
    const looseRegex = /^.{1,20}[：:]\s*$/gm;
    const looseMatches: { index: number; title: string }[] = [];
    const looseRe = new RegExp(looseRegex.source, 'gm');
    let lm: RegExpExecArray | null;
    while ((lm = looseRe.exec(text)) !== null) {
      looseMatches.push({ index: lm.index, title: lm[0].trim() });
    }

    if (looseMatches.length >= 3) {
      return buildChapters(text, looseMatches);
    }

    return {
      success: false,
      chapters: [],
      totalChapters: matches.length,
      message: `仅识别到 ${matches.length} 个章节标记，需要至少 3 个。请确认文本包含明确的章节标题（如"第一章"、"Chapter 1"）。`,
    };
  }

  return buildChapters(text, matches);
}

/**
 * 根据匹配点构建章节数组
 */
function buildChapters(text: string, matches: { index: number; title: string }[]): SplitResult {
  const chapters: Chapter[] = [];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const rawContent = text.slice(start, end).trim();
    const content = rawContent; // 含标题行

    chapters.push({
      index: i + 1,
      title: matches[i].title,
      content,
      charCount: content.length,
    });
  }

  return {
    success: true,
    chapters,
    totalChapters: chapters.length,
  };
}

/**
 * 统计文本中的章节数（不切分，仅计数）
 */
export function countChapters(text: string): number {
  if (!text) return 0;
  const matches = text.match(CHAPTER_REGEX);
  return matches?.length ?? 0;
}
