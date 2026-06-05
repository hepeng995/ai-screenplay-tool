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
});
