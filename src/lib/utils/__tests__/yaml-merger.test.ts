import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { mergeYamlChapters } from '../yaml-merger';
import { validateYaml } from '../yaml-validator';

/**
 * 辅助：用 js-yaml 直接序列化一个对象成 YAML 字符串
 * 保留中文字面 & 字段顺序，避免字符串拼接出错。
 */
function dumpYaml(obj: unknown): string {
  return yaml.dump(obj, { indent: 2, lineWidth: 120, sortKeys: false });
}

describe('mergeYamlChapters', () => {
  it('空数组返回空字符串', () => {
    expect(mergeYamlChapters([])).toBe('');
  });

  it('单章节直接返回原样', () => {
    const single = 'script:\n  title: "x"\n';
    expect(mergeYamlChapters([single])).toBe(single);
  });

  it('两章节合并后 acts 数量等于两章 acts 之和', () => {
    const ch1 = dumpYaml({
      script: { title: 'A', source: 's', adapted_at: '2026-06-05' },
      metadata: { characters: ['角色A'] },
      acts: [
        {
          act_number: 1,
          title: '第一幕',
          scenes: [
            {
              scene_number: 1,
              location: '场景1',
              characters_present: ['角色A'],
              dialogues: [{ character: '角色A', type: '对白', content: 'hi' }],
            },
          ],
        },
      ],
    });
    const ch2 = dumpYaml({
      script: { title: 'A', source: 's', adapted_at: '2026-06-05' },
      metadata: { characters: ['角色B'] },
      acts: [
        {
          act_number: 1,
          title: '第二幕',
          scenes: [
            {
              scene_number: 1,
              location: '场景2',
              characters_present: ['角色B'],
              dialogues: [{ character: '角色B', type: '对白', content: 'hey' }],
            },
          ],
        },
      ],
    });

    const merged = mergeYamlChapters([ch1, ch2]);
    const parsed = validateYaml(merged);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.acts).toHaveLength(2);
  });

  it('characters 跨章节去重，保留首次出现顺序', () => {
    const ch1 = dumpYaml({
      script: { title: 'A', source: 's', adapted_at: '2026-06-05' },
      metadata: { characters: ['角色A', '角色B'] },
      acts: [
        {
          act_number: 1,
          title: '第一幕',
          scenes: [
            {
              scene_number: 1,
              location: '场景',
              characters_present: ['角色A'],
              dialogues: [{ character: '角色A', type: '对白', content: 'a' }],
            },
          ],
        },
      ],
    });
    const ch2 = dumpYaml({
      script: { title: 'A', source: 's', adapted_at: '2026-06-05' },
      metadata: { characters: ['角色B', '角色C'] },
      acts: [
        {
          act_number: 1,
          title: '第二幕',
          scenes: [
            {
              scene_number: 1,
              location: '场景',
              characters_present: ['角色B'],
              dialogues: [{ character: '角色B', type: '对白', content: 'b' }],
            },
          ],
        },
      ],
    });

    const merged = mergeYamlChapters([ch1, ch2]);
    const parsed = validateYaml(merged);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.metadata.characters).toEqual([
      '角色A',
      '角色B',
      '角色C',
    ]);
  });

  it('settings 跨章节去重', () => {
    const ch1 = dumpYaml({
      script: { title: 'A', source: 's', adapted_at: '2026-06-05' },
      metadata: {
        characters: ['角色A'],
        settings: ['乌衣巷', '林府客厅'],
      },
      acts: [
        {
          act_number: 1,
          title: '第一幕',
          scenes: [
            {
              scene_number: 1,
              location: '乌衣巷',
              characters_present: ['角色A'],
              dialogues: [{ character: '角色A', type: '对白', content: 'a' }],
            },
          ],
        },
      ],
    });
    const ch2 = dumpYaml({
      script: { title: 'A', source: 's', adapted_at: '2026-06-05' },
      metadata: {
        characters: ['角色A'],
        settings: ['林府客厅', '林府书房'],
      },
      acts: [
        {
          act_number: 1,
          title: '第二幕',
          scenes: [
            {
              scene_number: 1,
              location: '林府书房',
              characters_present: ['角色A'],
              dialogues: [{ character: '角色A', type: '对白', content: 'b' }],
            },
          ],
        },
      ],
    });

    const merged = mergeYamlChapters([ch1, ch2]);
    const parsed = validateYaml(merged);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.metadata.settings).toEqual([
      '乌衣巷',
      '林府客厅',
      '林府书房',
    ]);
  });

  it('非法 YAML + 合法 YAML 合并时返回合法部分（不崩溃）', () => {
    const invalid = 'not yaml at all {{{';
    const valid = dumpYaml({
      script: { title: '合法', source: 's', adapted_at: '2026-06-05' },
      metadata: { characters: ['角色A'] },
      acts: [
        {
          act_number: 1,
          title: '第一幕',
          scenes: [
            {
              scene_number: 1,
              location: '场景',
              characters_present: ['角色A'],
              dialogues: [{ character: '角色A', type: '对白', content: 'ok' }],
            },
          ],
        },
      ],
    });

    const merged = mergeYamlChapters([invalid, valid]);
    const parsed = validateYaml(merged);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.script.title).toBe('合法');
    expect(parsed.data?.acts).toHaveLength(1);
  });

  it('全部非法时返回包含注释的字符串，不抛异常', () => {
    const invalid1 = 'not yaml {{{';
    const invalid2 = '::::not yaml either';
    const result = mergeYamlChapters([invalid1, invalid2]);
    expect(result).toContain('合并失败');
    expect(() => mergeYamlChapters([invalid1, invalid2])).not.toThrow();
  });

  it('合并产物可通过 validateYaml 校验（多章节端到端）', () => {
    const ch1 = dumpYaml({
      script: {
        title: '深夜来电·第一章',
        source: '小说',
        adapted_at: '2026-06-05',
        adapter: '测试',
      },
      metadata: {
        genre: '悬疑',
        characters: ['林晚秋', '小翠'],
        settings: ['乌衣巷'],
        summary: '第一章故事概要',
      },
      acts: [
        {
          act_number: 1,
          title: '偶遇',
          scenes: [
            {
              scene_number: 1,
              location: '乌衣巷',
              time: '梅雨季的白天',
              characters_present: ['林晚秋', '小翠'],
              description: '下雨天偶遇',
              dialogues: [
                {
                  character: '小翠',
                  type: '对白',
                  content: '小姐，快回府吧。',
                  action: '轻声抱怨',
                },
                {
                  character: '林晚秋',
                  type: '对白',
                  content: '好。',
                },
              ],
            },
          ],
        },
      ],
    });
    const ch2 = dumpYaml({
      script: {
        title: '深夜来电·第二章',
        source: '小说',
        adapted_at: '2026-06-05',
        adapter: '测试',
      },
      metadata: {
        genre: '悬疑',
        characters: ['林晚秋', '林怀远'],
        settings: ['林府书房'],
        summary: '第二章故事概要',
      },
      acts: [
        {
          act_number: 1,
          title: '暗流',
          scenes: [
            {
              scene_number: 1,
              location: '林府书房',
              characters_present: ['林晚秋', '林怀远'],
              dialogues: [
                {
                  character: '林怀远',
                  type: '对白',
                  content: '晚秋，有些事……爹本想等你再大些再告诉你。',
                },
              ],
            },
          ],
        },
      ],
    });

    const merged = mergeYamlChapters([ch1, ch2]);
    const result = validateYaml(merged);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const data = result.data!;
    // acts 数量 = 两章之和
    expect(data.acts).toHaveLength(2);
    // characters 去重
    expect(data.metadata.characters).toEqual([
      '林晚秋',
      '小翠',
      '林怀远',
    ]);
    // settings 去重
    expect(data.metadata.settings).toEqual(['乌衣巷', '林府书房']);
    // script 元信息以第一章为基础
    expect(data.script.title).toBe('深夜来电·第一章');
    // 其他 metadata 字段（genre/summary）保留第一章的
    expect(data.metadata.genre).toBe('悬疑');
    expect(data.metadata.summary).toBe('第一章故事概要');
  });

  it('缺少 acts 字段的章节被跳过 acts 但仍参与 metadata 合并', () => {
    const noActs = dumpYaml({
      script: { title: 'A', source: 's', adapted_at: '2026-06-05' },
      metadata: { characters: ['新角色'] },
      // 故意没有 acts
    });
    const withActs = dumpYaml({
      script: { title: 'B', source: 's', adapted_at: '2026-06-05' },
      metadata: { characters: ['角色A'] },
      acts: [
        {
          act_number: 1,
          title: '唯一一幕',
          scenes: [
            {
              scene_number: 1,
              location: '场景',
              characters_present: ['角色A'],
              dialogues: [{ character: '角色A', type: '对白', content: 'hi' }],
            },
          ],
        },
      ],
    });

    const merged = mergeYamlChapters([noActs, withActs]);
    const parsed = validateYaml(merged);
    expect(parsed.success).toBe(true);
    // 只有一章贡献了 acts
    expect(parsed.data?.acts).toHaveLength(1);
    // 两章的 characters 都被合并
    expect(parsed.data?.metadata.characters).toEqual(['新角色', '角色A']);
  });

  it('多章合并后 act_number 全局连续、各幕 scene_number 从 1 重排', () => {
    // 模拟 AI 逐章独立编号：每章都从 act_number:1 / scene_number:1 开始
    const makeCh = (title: string, sceneCount: number) =>
      dumpYaml({
        script: { title, source: 's', adapted_at: '2026-06-05' },
        metadata: { characters: ['角色A'] },
        acts: [
          {
            act_number: 1,
            title,
            scenes: Array.from({ length: sceneCount }, (_, i) => ({
              scene_number: 1, // 故意都写 1，验证合并时会被重排
              location: `场景${i}`,
              characters_present: ['角色A'],
              dialogues: [{ character: '角色A', type: '对白', content: 'x' }],
            })),
          },
        ],
      });

    const merged = mergeYamlChapters([makeCh('第一章', 2), makeCh('第二章', 1)]);
    const parsed = validateYaml(merged);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const acts = parsed.data!.acts;
    expect(acts).toHaveLength(2);
    // act_number 全局连续
    expect(acts[0].act_number).toBe(1);
    expect(acts[1].act_number).toBe(2);
    // 各幕内 scene_number 从 1 重排
    expect(acts[0].scenes.map((s) => s.scene_number)).toEqual([1, 2]);
    expect(acts[1].scenes.map((s) => s.scene_number)).toEqual([1]);
  });
});
