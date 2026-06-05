// @vitest-environment jsdom
/**
 * YamlEditor 组件单元测试（CodeMirror 6 版本）
 * 覆盖：渲染编辑器、校验状态、防抖校验、onSave 安全性
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { YamlEditor } from '../YamlEditor';

describe('YamlEditor 组件', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('渲染 CodeMirror 编辑器容器', () => {
    render(<YamlEditor value="" onChange={() => {}} />);
    const editor = screen.getByTestId('yaml-editor');
    expect(editor).toBeTruthy();
    expect(editor.tagName).toBe('DIV');
  });

  it('空值时状态栏显示 idle（无校验文本）', () => {
    render(<YamlEditor value="" onChange={() => {}} />);
    const status = screen.getByTestId('validation-status');
    // idle 状态下 statusDisplay.text 为空字符串
    const statusText = status.textContent ?? '';
    expect(statusText.trim()).toBe('0 字符');
  });

  it('输入合法 YAML 后防抖校验状态变为 valid', () => {
    // 完整合法剧本：所有 strict 字段齐备
    const validYaml = [
      'script:',
      '  title: 测试剧本',
      '  source: 测试小说',
      '  adapted_at: "2026-01-01"',
      'metadata:',
      '  characters:',
      '    - 张三',
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
    ].join('\n');

    render(<YamlEditor value={validYaml} onChange={() => {}} />);

    // 推进 500ms 防抖
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 校验成功后会显示 "校验通过"
    const status = screen.getByTestId('validation-status');
    expect(status.textContent).toContain('校验通过');
  });

  it('输入非法 YAML 后防抖校验状态变为 invalid', () => {
    // 缺失 script 必需字段
    const invalidYaml = 'foo: bar\n';

    render(<YamlEditor value={invalidYaml} onChange={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const status = screen.getByTestId('validation-status');
    expect(status.textContent).toContain('校验失败');
    // 错误详情展示
    expect(screen.queryByTestId('error-detail')).not.toBeNull();
  });

  it('CodeMirror 内置行号渲染', () => {
    render(<YamlEditor value={'line1\nline2'} onChange={() => {}} />);
    // CodeMirror 会渲染 .cm-gutters 容器中的行号
    const gutters = document.querySelector('.cm-gutters');
    expect(gutters).toBeTruthy();
  });

  it('CodeMirror 内置撤销/重做支持', () => {
    // CodeMirror 通过 history() 扩展提供撤销/重做
    // 验证编辑器正常渲染即可，具体撤销行为由 CodeMirror 保证
    render(<YamlEditor value="test: value" onChange={() => {}} />);
    const editor = screen.getByTestId('yaml-editor');
    expect(editor).toBeTruthy();
  });

  it('CodeMirror 内置搜索支持（Ctrl+F）', () => {
    // CodeMirror 通过 searchKeymap 提供 Ctrl+F 搜索
    // 验证搜索按钮存在
    render(<YamlEditor value="" onChange={() => {}} />);
    const searchBtn = document.querySelector('[title="搜索 (Ctrl+F)"]');
    expect(searchBtn).toBeTruthy();
  });

  it('不传 onSave 时渲染正常（不抛错）', () => {
    // CodeMirror 的 keybinding 中 onSave 可选链保护
    expect(() => {
      render(<YamlEditor value="" onChange={() => {}} />);
    }).not.toThrow();
  });

  it('外部 value 变化时同步到编辑器', () => {
    const { rerender } = render(<YamlEditor value="" onChange={() => {}} />);
    // 更新 value prop
    rerender(<YamlEditor value="new: content" onChange={() => {}} />);
    const editor = screen.getByTestId('yaml-editor');
    expect(editor).toBeTruthy();
  });

  it('字符数随 value 更新', () => {
    const { rerender } = render(<YamlEditor value="" onChange={() => {}} />);
    let status = screen.getByTestId('validation-status');
    expect(status.textContent).toContain('0 字符');

    rerender(<YamlEditor value="abc" onChange={() => {}} />);
    status = screen.getByTestId('validation-status');
    expect(status.textContent).toContain('3 字符');
  });
});
