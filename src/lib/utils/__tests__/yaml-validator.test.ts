import { describe, it, expect } from 'vitest';
import { validateYaml } from '../yaml-validator';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// 读取有效示例
const validYaml = readFileSync(
  resolve(process.cwd(), 'docs/example.yaml'),
  'utf-8',
);

describe('validateYaml', () => {
  it('合法 YAML 通过校验', () => {
    const result = validateYaml(validYaml);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.acts.length).toBeGreaterThan(0);
  });

  it('缺少必填字段 title 时返回错误', () => {
    const yaml = validYaml.replace(/title:\s*".*?"/, '');
    const result = validateYaml(yaml);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('枚举值错误（type 设为非法值）返回错误', () => {
    const yaml = validYaml.replace(/type:\s*"对白"/, 'type: "唱歌"');
    const result = validateYaml(yaml);
    expect(result.success).toBe(false);
    if (result.errors) {
      expect(result.errors.some((e) => e.message.includes('对白'))).toBe(true);
    }
  });

  it('空对话数组返回错误', () => {
    const yaml = validYaml.replace(
      /dialogues:[\s\S]*?(?=\n\s*-\s*scene_number|\n\s*$)/,
      'dialogues: []',
    );
    const result = validateYaml(yaml);
    expect(result.success).toBe(false);
  });

  it('完全畸形输入不抛异常', () => {
    const result = validateYaml('not yaml at all {{{');
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('日期格式错误返回错误', () => {
    const yaml = validYaml.replace(
      /adapted_at:\s*"\d{4}-\d{2}-\d{2}"/,
      'adapted_at: "2026/06/05"',
    );
    const result = validateYaml(yaml);
    expect(result.success).toBe(false);
    if (result.errors) {
      expect(
        result.errors.some((e) => e.message.includes('YYYY-MM-DD')),
      ).toBe(true);
    }
  });

  it('空字符串返回根节点错误', () => {
    const result = validateYaml('');
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('未知字段被 passthrough 模式放行（AI 输出宽容校验）', () => {
    const yaml = validYaml.replace(
      'script:',
      'unknown_root_field: "hello"\nscript:',
    );
    const result = validateYaml(yaml);
    // passthrough 模式允许额外字段，只要必填字段齐全就通过
    expect(result.success).toBe(true);
  });
});
