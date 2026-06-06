import { describe, it, expect } from 'vitest';
import { extractYaml } from '../../ai/mimo';

describe('mimo AI utils', () => {
  describe('extractYaml', () => {
    it('从 ```yaml 代码块提取', () => {
      const raw = '好的，以下是 YAML 剧本：\n```yaml\nscript:\n  title: 测试\n```\n';
      const yaml = extractYaml(raw);
      expect(yaml).toBe('script:\n  title: 测试');
    });

    it('从 ```yml 代码块提取', () => {
      const raw = '```yml\nscript:\n  title: Test\n```';
      const yaml = extractYaml(raw);
      expect(yaml).toContain('script:');
    });

    it('无代码块时尝试裸 YAML', () => {
      const raw = '这是结果：\nscript:\n  title: 无代码块';
      const yaml = extractYaml(raw);
      expect(yaml).toContain('script:');
    });

    it('无代码块时裸 YAML 尾部残留 ``` 应被清除', () => {
      const raw = 'script:\n  title: 测试\nmetadata:\n  characters: ["A"]\nacts: []\n```';
      const yaml = extractYaml(raw);
      expect(yaml).not.toContain('```');
      expect(yaml).toContain('script:');
    });

    it('关闭符 ``` 前无换行时仍能提取', () => {
      const raw = '```yaml\nscript:\n  title: 无换行关闭```后续文字';
      const yaml = extractYaml(raw);
      expect(yaml).toContain('script:');
      expect(yaml).not.toContain('```');
    });

    it('完全无关内容返回 null', () => {
      expect(extractYaml('这段话没有 YAML')).toBeNull();
    });

    it('空字符串返回 null', () => {
      expect(extractYaml('')).toBeNull();
    });
  });
});
