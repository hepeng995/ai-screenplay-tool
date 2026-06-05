// @vitest-environment jsdom
/**
 * YamlPreview 组件单元测试
 * 覆盖：空输入提示、合法 YAML 显示统计、非法 YAML 显示错误、树形展开
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { YamlPreview } from '../YamlPreview';

// 复用合法 YAML（与 YamlEditor 测试保持一致）
const VALID_YAML = [
  'script:',
  '  title: 测试剧本',
  '  source: 测试小说',
  '  adapted_at: "2026-01-01"',
  'metadata:',
  '  characters:',
  '    - 张三',
  '    - 李四',
  'acts:',
  '  - act_number: 1',
  '    title: 第一幕',
  '    scenes:',
  '      - scene_number: 1',
  '        location: 屋内',
  '        characters_present:',
  '          - 张三',
  '        dialogues:',
  '          - character: 张三',
  '            type: 对白',
  '            content: 你好',
  '          - character: 李四',
  '            type: 旁白',
  '            content: 风起了',
].join('\n');

describe('YamlPreview 组件', () => {
  it('空输入显示提示信息', () => {
    render(<YamlPreview yamlContent="" />);
    // 错误分支会显示 "YAML 解析错误"
    expect(screen.getByText('YAML 解析错误')).toBeTruthy();
    expect(screen.getByText('YAML 内容为空')).toBeTruthy();
  });

  it('只有空白字符也视为空', () => {
    // 注意：JSX 字符串属性不会转义 \n，需要用 expression
    render(<YamlPreview yamlContent={'   \n\t  '} />);
    expect(screen.getByText('YAML 内容为空')).toBeTruthy();
  });

  it('合法 YAML 显示统计信息（幕/场景/台词/角色）', () => {
    render(<YamlPreview yamlContent={VALID_YAML} />);

    const stats = screen.getByTestId('preview-stats');
    expect(stats).toBeTruthy();

    // 1 幕
    expect(screen.getByTestId('stats-acts').textContent).toContain('1');
    // 1 场景
    expect(screen.getByTestId('stats-scenes').textContent).toContain('1');
    // 2 条台词
    expect(screen.getByTestId('stats-dialogues').textContent).toContain('2');
    // 2 个角色（张三、李四）
    expect(screen.getByTestId('stats-characters').textContent).toContain('2');
  });

  it('合法 YAML 展示剧本标题', () => {
    render(<YamlPreview yamlContent={VALID_YAML} />);
    expect(screen.getByTestId('preview-title').textContent).toBe('测试剧本');
  });

  it('非法 YAML 显示解析错误', () => {
    // 故意制造语法错误：未闭合的引号 + 错误缩进
    const invalidYaml = 'script:\n  title: "未闭合\n  bad: : :';
    render(<YamlPreview yamlContent={invalidYaml} />);

    expect(screen.getByText('YAML 解析错误')).toBeTruthy();
  });

  it('解析结果非对象时显示错误', () => {
    // 纯字符串不是有效剧本对象
    render(<YamlPreview yamlContent="just a string" />);
    // "just a string" 会被解析为字符串，触发 "不是对象" 错误
    expect(screen.getByText('YAML 解析错误')).toBeTruthy();
  });

  it('默认展开第一幕，点击切换图标后折叠', () => {
    render(<YamlPreview yamlContent={VALID_YAML} />);

    // 默认第一幕展开 → 应存在 tree-act-0
    const act = screen.getByTestId('tree-act-0');
    expect(act).toBeTruthy();

    // 默认展开时第一幕下有场景 tree-scene-0-0
    expect(screen.queryByTestId('tree-scene-0-0')).not.toBeNull();

    // 点击第一幕标题按钮 → 折叠
    const actButton = act.querySelector('button');
    expect(actButton).not.toBeNull();
    fireEvent.click(actButton as HTMLElement);

    // 折叠后场景应消失
    expect(screen.queryByTestId('tree-scene-0-0')).toBeNull();
  });

  it('展开场景时显示台词详情', () => {
    render(<YamlPreview yamlContent={VALID_YAML} />);

    // 第一幕默认展开 → 进入 tree-scene-0-0
    const scene = screen.getByTestId('tree-scene-0-0');
    const sceneButton = scene.querySelector('button');
    expect(sceneButton).not.toBeNull();

    // 默认未展开场景 → 点击展开
    fireEvent.click(sceneButton as HTMLElement);

    // 展开后应显示台词内容
    expect(screen.getByText('你好')).toBeTruthy();
    expect(screen.getByText('风起了')).toBeTruthy();
  });
});
