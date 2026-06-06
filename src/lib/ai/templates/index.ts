/**
 * 剧本模板系统
 * 不同类型的剧本模板对应不同的系统提示词和 Schema 微调
 */

/** 模板类型 */
export type TemplateType = 'default' | 'theater' | 'film' | 'radio';

/** 模板元信息 */
export interface TemplateMeta {
  id: TemplateType;
  name: string;
  description: string;
  icon: string;
}

/** 可用模板列表 */
export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'default',
    name: '通用剧本',
    description: '标准 YAML 剧本格式，适合小说改编',
    icon: '📝',
  },
  {
    id: 'theater',
    name: '话剧剧本',
    description: '侧重舞台指示和对白，适合话剧排演',
    icon: '🎭',
  },
  {
    id: 'film',
    name: '影视剧剧本',
    description: '含镜头语言和场景调度，适合影视拍摄',
    icon: '🎬',
  },
  {
    id: 'radio',
    name: '广播剧剧本',
    description: '侧重声音效果和旁白，适合音频剧',
    icon: '📻',
  },
];

/** 获取模板的系统提示词前缀 */
export function getTemplatePromptPrefix(templateId: TemplateType): string {
  switch (templateId) {
    case 'theater':
      return `你是一位专业的话剧编剧。你的任务是将小说章节文本转换为话剧剧本格式的 YAML。

## 话剧剧本特点
- 注重舞台空间感，场景描述需包含布景和灯光提示
- 对白是核心，需充分挖掘角色的语言表达
- 动作指示需适合舞台表演（非特效）
- 场景切换使用"幕"和"场"的戏剧结构`;

    case 'film':
      return `你是一位专业的影视编剧。你的任务是将小说章节文本转换为影视剧本格式的 YAML。

## 影视剧本特点
- 场景描述需包含镜头角度和运动（如：近景/全景/跟拍）
- 注重画面构图和视觉叙事
- 对白可配合表情和微动作指示
- 节奏感强，场景切换灵活`;

    case 'radio':
      return `你是一位专业的广播剧编剧。你的任务是将小说章节文本转换为广播剧剧本格式的 YAML。

## 广播剧剧本特点
- 一切通过声音传达，需详细的音效（SFX）和背景音乐（BGM）指示
- 旁白比其他格式更重要，用于描述视觉画面
- 对白需要更丰富的语气描述
- 场景切换通过声音过渡`;

    default:
      return '';
  }
}

/** 获取模板的对话类型扩展 */
export function getTemplateDialogueTypes(templateId: TemplateType): string[] {
  const baseTypes = ['对白', '独白', '旁白', '动作'];

  switch (templateId) {
    case 'theater':
      return [...baseTypes, '舞台指示'];
    case 'film':
      return [...baseTypes, '镜头', '画外音'];
    case 'radio':
      return [...baseTypes, '音效', 'BGM'];
    default:
      return baseTypes;
  }
}
