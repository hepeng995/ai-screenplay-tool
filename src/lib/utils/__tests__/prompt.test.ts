import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPT, buildUserPrompt } from '../../ai/prompt';

describe('AI Prompt', () => {
  describe('SYSTEM_PROMPT', () => {
    it('包含 YAML Schema 规范', () => {
      expect(SYSTEM_PROMPT).toContain('script:');
      expect(SYSTEM_PROMPT).toContain('acts:');
      expect(SYSTEM_PROMPT).toContain('scenes:');
    });

    it('Prompt 字段与 ScriptSchema 对齐', () => {
      // script 字段：title, source, adapted_at, adapter
      expect(SYSTEM_PROMPT).toContain('source:');
      expect(SYSTEM_PROMPT).toContain('adapted_at:');
      expect(SYSTEM_PROMPT).toContain('adapter:');
      // metadata 字段：genre, characters, settings, summary
      expect(SYSTEM_PROMPT).toContain('genre:');
      expect(SYSTEM_PROMPT).toContain('characters:');
      expect(SYSTEM_PROMPT).toContain('settings:');
      expect(SYSTEM_PROMPT).toContain('summary:');
      // acts 字段：act_number, title, scenes
      expect(SYSTEM_PROMPT).toContain('act_number:');
      // scenes 字段：scene_number, location, time, characters_present, description, dialogues
      expect(SYSTEM_PROMPT).toContain('scene_number:');
      expect(SYSTEM_PROMPT).toContain('characters_present:');
      expect(SYSTEM_PROMPT).toContain('location:');
      // dialogues 字段：character, type, content, action
      expect(SYSTEM_PROMPT).toContain('character:');
      expect(SYSTEM_PROMPT).toContain('type:');
      expect(SYSTEM_PROMPT).toContain('content:');
      expect(SYSTEM_PROMPT).toContain('action:');
    });

    it('包含对话类型定义', () => {
      expect(SYSTEM_PROMPT).toContain('对白');
      expect(SYSTEM_PROMPT).toContain('独白');
      expect(SYSTEM_PROMPT).toContain('旁白');
      expect(SYSTEM_PROMPT).toContain('动作');
    });

    it('包含改编规则', () => {
      expect(SYSTEM_PROMPT).toContain('保留核心剧情');
      expect(SYSTEM_PROMPT).toContain('提取角色对话');
    });
  });

  describe('buildUserPrompt', () => {
    it('包含章节标题', () => {
      const prompt = buildUserPrompt('第一章 测试', '内容...');
      expect(prompt).toContain('第一章 测试');
    });

    it('包含章节内容', () => {
      const prompt = buildUserPrompt('测试', '这是一段小说正文。');
      expect(prompt).toContain('这是一段小说正文。');
    });

    it('超长文本被截断', () => {
      const longText = 'A'.repeat(5000);
      const prompt = buildUserPrompt('测试', longText);
      expect(prompt).toContain('[文本已截断]');
      expect(prompt.length).toBeLessThan(longText.length + 1000);
    });

    it('短文本不截断', () => {
      const shortText = '短文本';
      const prompt = buildUserPrompt('测试', shortText);
      expect(prompt).not.toContain('[文本已截断]');
    });
  });
});
