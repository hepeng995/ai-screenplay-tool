import yaml from 'js-yaml';

/**
 * 单个章节 YAML 解析后的中间结构（宽松形状，仅用于合并）
 *
 * 完整 Schema 见 src/schema/script.schema.ts；
 * 这里只关心合并需要涉及的几个字段，其余字段会被原样保留。
 */
interface ParsedChapter {
  script?: {
    title?: string;
    source?: string;
    adapted_at?: string;
    adapter?: string;
    [k: string]: unknown;
  };
  metadata?: {
    characters?: string[];
    settings?: string[];
    [k: string]: unknown;
  };
  acts?: unknown[];
  [k: string]: unknown;
}

/**
 * 合并多章节 YAML 为一个完整剧本。
 *
 * 合并规则：
 *   1. 空数组 → 返回空字符串
 *   2. 单章节 → 原样返回
 *   3. 多章节 → 结构化合并：
 *      - 合并所有 `acts` 到同一数组（按章节顺序）
 *      - 合并 `metadata.characters`（去重，保留首次出现顺序）
 *      - 合并 `metadata.settings`（去重）
 *      - `script` 元信息以第一个解析成功的章节为基础
 *   4. 错误兜底：
 *      - 单个章节解析失败 → 跳过该章节（不影响其他章节）
 *      - 全部解析失败 → 返回带注释的空 YAML
 *      - 缺少 `acts` 字段 → 跳过该章节的 acts，但仍尝试合并 metadata
 *
 * @param yamls 多个章节的 YAML 字符串数组
 * @returns 合并后的 YAML 字符串
 */
export function mergeYamlChapters(yamls: string[]): string {
  // 1. 空数组
  if (yamls.length === 0) return '';

  // 2. 单章节直接返回（避免不必要的 dump 改变格式）
  if (yamls.length === 1) return yamls[0];

  // 3. 多章节：解析所有 YAML，过滤掉解析失败的
  const parsed: ParsedChapter[] = [];
  for (const src of yamls) {
    try {
      const obj = yaml.load(src);
      // 只接受非 null 对象
      if (obj != null && typeof obj === 'object' && !Array.isArray(obj)) {
        parsed.push(obj as ParsedChapter);
      }
    } catch {
      // 单个章节解析失败 → 跳过，不中断合并
    }
  }

  // 4. 全部解析失败 → 返回注释字符串
  if (parsed.length === 0) {
    return '# 合并失败：所有章节解析均出错\n';
  }

  // 5. 合并 metadata.characters（去重，保留首次出现顺序）
  const characters: string[] = [];
  for (const ch of parsed) {
    const list = ch.metadata?.characters;
    if (Array.isArray(list)) {
      for (const c of list) {
        if (typeof c === 'string' && !characters.includes(c)) {
          characters.push(c);
        }
      }
    }
  }

  // 6. 合并 metadata.settings（去重）
  const settings: string[] = [];
  for (const ch of parsed) {
    const list = ch.metadata?.settings;
    if (Array.isArray(list)) {
      for (const s of list) {
        if (typeof s === 'string' && !settings.includes(s)) {
          settings.push(s);
        }
      }
    }
  }

  // 7. 合并 acts：按章节顺序追加
  const acts: unknown[] = [];
  for (const ch of parsed) {
    if (Array.isArray(ch.acts)) {
      acts.push(...ch.acts);
    }
  }

  // 8. script 元信息以第一个解析成功的章节为基础
  const script = parsed[0].script ?? {};

  // 9. metadata：以第一个章节为基础（保留 genre/summary 等字段），
  //    再用合并后的 characters / settings 覆盖
  // 设计决策：script 和 metadata 元信息以第一个解析成功的章节为基础（见 JSDoc 第 36 行）
  const baseMeta = parsed[0].metadata ?? {};
  // settings：只要有合并结果或第一章原本就有，就输出该字段
  const hasSettings = settings.length > 0 || Array.isArray(baseMeta.settings);
  const merged: Record<string, unknown> = {
    script,
    metadata: {
      ...baseMeta,
      characters,
      ...(hasSettings ? { settings } : {}),
    },
    acts,
  };

  // 10. 序列化输出
  return yaml.dump(merged, {
    indent: 2,
    lineWidth: 120,
    // 不排序键，保留章节内字段的原始顺序
    sortKeys: false,
  });
}
