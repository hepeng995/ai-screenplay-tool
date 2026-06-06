/**
 * 局部重新生成 API 路由（Edge Runtime）
 * POST /api/regenerate — 重新生成指定场景或台词
 */

import { NextRequest, NextResponse } from 'next/server';
import { transformChapterToYaml, withConcurrencyLimit } from '@/lib/ai/mimo';
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = 'edge';
export const maxDuration = 25;

interface RegenerateRequest {
  /** 重新生成类型 */
  type: 'scene' | 'dialogue';
  /** 场景/台词所在上下文（前后文 YAML 片段，供 AI 理解连贯性） */
  context: string;
  /** 用户补充说明（可选，如"让对话更激烈"） */
  instruction?: string;
}

export const POST = withErrorHandler<NextRequest>(async (request) => {
  const body: RegenerateRequest = await request.json();

  // 参数校验
  if (!body.type || !['scene', 'dialogue'].includes(body.type)) {
    return NextResponse.json(
      { success: false, error: 'type 必须为 scene 或 dialogue' },
      { status: 400 },
    );
  }

  if (!body.context || body.context.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'context 不能为空' },
      { status: 400 },
    );
  }

  if (body.context.length > 5000) {
    return NextResponse.json(
      { success: false, error: '上下文内容不能超过 5000 字' },
      { status: 400 },
    );
  }

  // 构建 Prompt
  const prompt = buildRegeneratePrompt(body.type, body.context, body.instruction);

  const result = await withConcurrencyLimit(() =>
    transformChapterToYaml(
      body.type === 'scene' ? '场景重新生成' : '台词重新生成',
      prompt,
    ),
  );

  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result, { status: 200 });
});

/**
 * 构建局部重新生成的 Prompt
 */
function buildRegeneratePrompt(
  type: 'scene' | 'dialogue',
  context: string,
  instruction?: string,
): string {
  const typeLabel = type === 'scene' ? '场景（scene）' : '台词（dialogue）';
  const instructionText = instruction ? `\n\n用户补充要求：${instruction}` : '';

  return `你是一位专业的剧本改编师。以下是一段已有的剧本 YAML 片段。

请重新生成其中标注为「需要重新生成」的${typeLabel}部分，保持与前后文的连贯性和风格一致。

已有剧本上下文：
---
${context}
---

要求：
1. 输出格式为 YAML，严格遵循原有的 Schema 结构
2. 只输出重新生成的${typeLabel}部分，用 \`\`\`yaml 代码块包裹
3. 保持角色性格和情节连贯
4. 不要添加额外解释文字${instructionText}`;
}
