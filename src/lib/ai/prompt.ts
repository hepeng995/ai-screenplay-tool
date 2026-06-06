/**
 * AI Prompt 设计
 * T2.3: mimo-v2.5 系统提示词
 *
 * 重要：SYSTEM_PROMPT 中的 YAML 模板必须与 src/schema/script.schema.ts
 * 的 Zod Schema 字段名和结构严格一致，否则编辑器校验将永远失败。
 */

import { type TemplateType, getTemplatePromptPrefix, getTemplateDialogueTypes } from './templates';

/**
 * 构建完整的系统提示词（根据模板类型动态生成）
 */
export function buildSystemPrompt(templateId: TemplateType = 'default'): string {
  const prefix = getTemplatePromptPrefix(templateId);
  const dialogueTypes = getTemplateDialogueTypes(templateId);

  const typesList = dialogueTypes.map((t) => `- "${t}"`).join('\n');

  const intro = templateId === 'default'
    ? '你是一位专业的剧本改编师。你的任务是将小说章节文本转换为结构化的 YAML 格式剧本。'
    : prefix;

  return `${intro}

## Schema（字段名不可更改）

\`\`\`yaml
script:
  title: "剧本标题"
  source: "原小说名称"        # 必填
  adapted_at: "YYYY-MM-DD"   # 必填
  adapter: "改编者姓名"       # 可选
metadata:
  genre: "玄幻|言情|悬疑|都市|科幻|武侠|历史|其他"  # 可选
  characters: ["角色1", "角色2"]  # 必填，≥1
  settings: ["场景设定"]          # 可选
  summary: "本章节概要"           # 可选
acts:
  - act_number: 1            # 必填，从1开始
    title: "幕标题"            # 必填
    scenes:
      - scene_number: 1      # 必填，从1开始
        location: "场景地点"   # 必填
        time: "日/夜/黄昏"     # 可选
        characters_present: ["角色1"]  # 必填，≥1
        description: "场景描述"         # 可选
        dialogues:
          - character: "角色名"   # 必填
            type: "对白"          # 必填，见下方类型列表
            content: "台词内容"   # 必填
            action: "动作/表情"   # 可选
\`\`\`

## type 可选值
${typesList}

## 要求

1. 保留核心剧情，不遗漏关键情节转折
2. 提取角色对话，将叙述转化为对话形式
3. 基于文本推断场景细节，结构化分幕分场
4. 识别所有有名角色，语言精炼但保留原文风格
5. 输出合法 YAML，用 \`\`\`yaml 代码块包裹，不加解释文字
6. 每章 ≥1 幕，每场景 ≥1 条对话，所有必填字段不可省略`;
}

/**
 * 向后兼容：默认的系统提示词（通用模板）
 */
export const SYSTEM_PROMPT = buildSystemPrompt('default');

/**
 * 单章正文截断上限。
 * 低于 /api/convert 的 10000 字硬限制与 mimo 8192 max_tokens 余量，
 * 尽量减少长章节正文被砍；超过此长度的部分不会进入 AI，前端会就此提示用户。
 */
export const CHAPTER_TEXT_TRUNCATE_LIMIT = 6000;

/**
 * 用户提示词模板
 */
export function buildUserPrompt(chapterTitle: string, chapterText: string, instruction?: string): string {
  // 截断超长文本（mimo 上下文限制）
  const truncated = chapterText.length > CHAPTER_TEXT_TRUNCATE_LIMIT
    ? chapterText.slice(0, CHAPTER_TEXT_TRUNCATE_LIMIT) + '\n\n[文本已截断]'
    : chapterText;

  // 用户自定义补充要求（如"多用心理独白"/"控制在 5 个场景内"）
  const instructionText = instruction && instruction.trim()
    ? `\n\n## 用户补充要求（在不违反上述 Schema 的前提下尽量遵循）\n${instruction.trim()}`
    : '';

  return `请将以下小说章节转换为 YAML 格式剧本。

章节标题：${chapterTitle}

章节内容：
---
${truncated}
---${instructionText}

请输出 YAML 格式的剧本。`;
}
