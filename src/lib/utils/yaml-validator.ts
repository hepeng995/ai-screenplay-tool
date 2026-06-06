import yaml from 'js-yaml';
import { ScriptSchema, type Script } from '@/schema/script.schema';

export interface ValidationResult {
  success: boolean;
  data?: Script;
  errors?: Array<{ path: string; message: string }>;
}

/**
 * 校验 YAML 字符串是否符合剧本 Schema
 * @param yamlString YAML 格式的字符串
 * @returns 校验结果，含 data 或 errors
 */
export function validateYaml(yamlString: string): ValidationResult {
  // 0. 预处理：防御性去除 markdown 代码块包裹
  //    AI 输出或用户粘贴的内容可能仍包含 ```yaml ... ``` 围栏
  let cleanInput = yamlString.trim();
  const fenceMatch = cleanInput.match(/^```(?:ya?ml)?\s*\n([\s\S]*?)\n?```\s*$/i);
  if (fenceMatch) {
    cleanInput = fenceMatch[1].trim();
  }

  // 1. 解析 YAML
  let parsed: unknown;
  try {
    parsed = yaml.load(cleanInput);
  } catch (e) {
    return {
      success: false,
      errors: [{ path: '', message: `YAML 解析失败: ${(e as Error).message}` }],
    };
  }

  // 2. 空值/非对象兜底（数组也不符合 Schema 要求）
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      success: false,
      errors: [{ path: '', message: 'YAML 根节点必须是对象' }],
    };
  }

  // 3. Zod 校验
  const result = ScriptSchema.safeParse(parsed);
  if (result.success) {
    return { success: true, data: result.data };
  }

  // 4. 格式化错误
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}
