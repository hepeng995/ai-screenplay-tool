// @vitest-environment jsdom
/**
 * YamlEditor 组件单元测试
 * 覆盖：渲染 textarea、输入触发 onChange、Ctrl+S 触发 onSave、防抖校验状态
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { YamlEditor } from '../YamlEditor';

describe('YamlEditor 组件', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('渲染 textarea 和占位符', () => {
    render(<YamlEditor value="" onChange={() => {}} />);
    const textarea = screen.getByTestId('yaml-editor') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.placeholder).toContain('YAML');
  });

  it('输入文本触发 onChange 回调', () => {
    const handleChange = vi.fn();
    render(<YamlEditor value="" onChange={handleChange} />);
    const textarea = screen.getByTestId('yaml-editor');

    fireEvent.change(textarea, { target: { value: 'script:\n  title: 测试' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('script:\n  title: 测试');
  });

  it('Ctrl+S 触发 onSave 回调', () => {
    const handleSave = vi.fn();
    render(<YamlEditor value="" onChange={() => {}} onSave={handleSave} />);

    // 模拟 Ctrl+S
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(handleSave).toHaveBeenCalledTimes(1);
  });

  it('Cmd+S（Mac）同样触发 onSave', () => {
    const handleSave = vi.fn();
    render(<YamlEditor value="" onChange={() => {}} onSave={handleSave} />);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(handleSave).toHaveBeenCalledTimes(1);
  });

  it('非 Ctrl+S 的普通按键不触发 onSave', () => {
    const handleSave = vi.fn();
    render(<YamlEditor value="" onChange={() => {}} onSave={handleSave} />);

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handleSave).not.toHaveBeenCalled();
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

  it('行号数量与内容行数一致', () => {
    // 空字符串 → 1 行号
    const { rerender } = render(<YamlEditor value="" onChange={() => {}} />);
    let lineNumbers = document.querySelector('[aria-hidden="true"]');
    expect(lineNumbers?.children.length).toBe(1);

    // 2 行内容 → 2 行号
    rerender(<YamlEditor value={'line1\nline2'} onChange={() => {}} />);
    lineNumbers = document.querySelector('[aria-hidden="true"]');
    expect(lineNumbers?.children.length).toBe(2);

    // 尾部换行 → 仍然 2 行号（不产生幽灵行号）
    rerender(<YamlEditor value={'line1\nline2\n'} onChange={() => {}} />);
    lineNumbers = document.querySelector('[aria-hidden="true"]');
    expect(lineNumbers?.children.length).toBe(2);
  });

  it('textarea 滚动时行号容器 transform 同步更新', () => {
    render(<YamlEditor value={'line1\nline2\nline3'} onChange={() => {}} />);

    const textarea = screen.getByTestId('yaml-editor') as HTMLTextAreaElement;
    const lineNumbersDiv = document.querySelector('[aria-hidden="true"]') as HTMLDivElement;

    // 初始 transform 应为空
    expect(lineNumbersDiv.style.transform).toBe('');

    // 模拟滚动
    fireEvent.scroll(textarea, { target: { scrollTop: 100 } });

    // 行号容器的 transform 应立即更新（ref 直操作 DOM）
    expect(lineNumbersDiv.style.transform).toContain('translateY');
    expect(lineNumbersDiv.style.transform).toContain('-100');
  });

  it('不传 onSave 时 Ctrl+S 不抛错', () => {
    render(<YamlEditor value="" onChange={() => {}} />);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    // 不应抛出异常（onSave?.() 可选链保护）
    expect(() => window.dispatchEvent(event)).not.toThrow();
  });
});
