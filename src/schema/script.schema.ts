import { z } from 'zod';

// 对话条目（使用 passthrough 允许 AI 输出的额外字段通过，避免严格拒绝）
export const DialogueSchema = z.object({
  character: z.string().min(1, '角色名不能为空'),
  type: z.enum(['对白', '独白', '旁白', '动作']),
  content: z.string().min(1, '台词内容不能为空'),
  action: z.string().optional(),
}).passthrough();

// 场景
export const SceneSchema = z.object({
  scene_number: z.number().int().min(1),
  location: z.string().min(1, '场景地点不能为空'),
  time: z.string().optional(),
  characters_present: z.array(z.string().min(1)).min(1, '至少需要 1 个在场角色'),
  description: z.string().optional(),
  dialogues: z.array(DialogueSchema).min(1, '每个场景至少需要 1 条对话'),
}).passthrough();

// 幕
export const ActSchema = z.object({
  act_number: z.number().int().min(1),
  title: z.string().min(1, '幕标题不能为空'),
  scenes: z.array(SceneSchema).min(1, '每幕至少需要 1 个场景'),
}).passthrough();

// 元数据
export const MetadataSchema = z.object({
  genre: z.enum(['玄幻', '言情', '悬疑', '都市', '科幻', '武侠', '历史', '其他']).optional(),
  characters: z.array(z.string().min(1)).min(1, '至少需要 1 个角色'),
  settings: z.array(z.string()).optional(),
  summary: z.string().optional(),
}).passthrough();

// 剧本根元信息
export const ScriptMetaSchema = z.object({
  title: z.string().min(1, '剧本标题不能为空'),
  source: z.string().min(1, '原小说名称不能为空'),
  adapted_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
  adapter: z.string().optional(),
}).passthrough();

// 完整剧本 Schema
export const ScriptSchema = z.object({
  script: ScriptMetaSchema,
  metadata: MetadataSchema,
  acts: z.array(ActSchema).min(1, '至少需要 1 幕'),
}).passthrough();

// 类型导出
export type Script = z.infer<typeof ScriptSchema>;
export type Dialogue = z.infer<typeof DialogueSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Act = z.infer<typeof ActSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
