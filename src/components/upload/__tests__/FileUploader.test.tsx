// @vitest-environment jsdom
/**
 * FileUploader 组件单元测试
 * 覆盖：渲染、文件类型校验、文件大小校验、文件信息展示
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUploader } from '../FileUploader';

// ===== Mock 依赖 =====

// mock next/navigation 的 useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// mock storage 模块（避免触碰真实 localStorage 索引）
const mockCreateProject = vi.fn((_name: string) => ({
  id: 'test-uuid',
  name: 'test.txt',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  status: 'uploaded' as const,
  chapterCount: 0,
}));
const mockSaveNovelText = vi.fn((_id: string, _text: string) => {});
vi.mock('@/lib/utils/storage', () => ({
  createProject: (name: string) => mockCreateProject(name),
  saveNovelText: (id: string, text: string) => mockSaveNovelText(id, text),
}));

// mock crypto.randomUUID（jsdom 环境可能没有）
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => 'test-uuid',
    },
    writable: true,
  });
}

describe('FileUploader 组件', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockCreateProject.mockClear();
    mockSaveNovelText.mockClear();
  });

  it('渲染拖拽上传区域和标题', () => {
    render(<FileUploader />);
    expect(screen.getByText(/步骤 1/)).toBeTruthy();
    expect(screen.getByTestId('upload-zone')).toBeTruthy();
    expect(screen.getByText(/点击选择文件或拖拽到此处/)).toBeTruthy();
  });

  it('拖拽 .csv 文件被拒绝（仅支持 .txt / .md）', async () => {
    render(<FileUploader />);
    const zone = screen.getByTestId('upload-zone');

    const file = new File(['hello'], 'test.csv', { type: 'text/csv' });
    fireEvent.drop(zone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      const errorEl = screen.queryByTestId('error-message');
      expect(errorEl).not.toBeNull();
      expect(errorEl?.textContent).toContain('仅支持');
    });
  });

  it('拖拽 .txt 文件被接受并显示文件信息', async () => {
    render(<FileUploader />);
    const zone = screen.getByTestId('upload-zone');

    const content = '第一章 起点\n正文内容...';
    const file = new File([content], '小说.txt', { type: 'text/plain' });
    fireEvent.drop(zone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId('file-info')).toBeTruthy();
      expect(screen.getByTestId('file-name').textContent).toBe('小说.txt');
    });
  });

  it('点击「下一步」调用 router.push 跳转', async () => {
    render(<FileUploader />);
    const zone = screen.getByTestId('upload-zone');

    const file = new File(['abc'], 'demo.txt', { type: 'text/plain' });
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    const nextBtn = await screen.findByTestId('next-btn');
    fireEvent.click(nextBtn);

    expect(mockCreateProject).toHaveBeenCalledWith('demo.txt');
    expect(mockSaveNovelText).toHaveBeenCalledWith('test-uuid', 'abc');
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/convert?fileId='));
  });

  it('文件超过 10MB 被拒绝', async () => {
    render(<FileUploader />);
    const zone = screen.getByTestId('upload-zone');

    // 构造 11MB 文件
    const largeContent = 'x'.repeat(11 * 1024 * 1024);
    const file = new File([largeContent], 'huge.txt', { type: 'text/plain' });
    fireEvent.drop(zone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      const errorEl = screen.queryByTestId('error-message');
      expect(errorEl).not.toBeNull();
      expect(errorEl?.textContent).toContain('10MB');
    });
  });

  it('文件内容为空时显示错误', async () => {
    render(<FileUploader />);
    const zone = screen.getByTestId('upload-zone');

    // 空内容文件
    const file = new File([''], 'empty.txt', { type: 'text/plain' });
    fireEvent.drop(zone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      const errorEl = screen.queryByTestId('error-message');
      expect(errorEl).not.toBeNull();
      expect(errorEl?.textContent).toContain('空');
    });
  });

  it('通过 input onChange 选择文件也能正确处理', async () => {
    render(<FileUploader />);

    // 找到隐藏的 input[type=file]
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    const file = new File(['hello world'], 'via-input.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('file-info')).toBeTruthy();
      expect(screen.getByTestId('file-name').textContent).toBe('via-input.txt');
    });
  });

  it('FileReader onerror 不崩溃并显示错误', async () => {
    // 模拟 FileReader 报错
    const originalFileReader = globalThis.FileReader;
    globalThis.FileReader = vi.fn(() => ({
      onload: null,
      onerror: null,
      readAsText: function () {
        // 异步触发 onerror
        setTimeout(() => {
          const handler = this.onerror as ((e: Event) => void) | null;
          if (handler) handler(new Event('error'));
        }, 0);
      },
    })) as any;

    render(<FileUploader />);
    const zone = screen.getByTestId('upload-zone');

    const file = new File(['content'], 'error.txt', { type: 'text/plain' });
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      const errorEl = screen.queryByTestId('error-message');
      expect(errorEl).not.toBeNull();
      expect(errorEl?.textContent).toContain('读取失败');
    });

    // 恢复原始 FileReader
    globalThis.FileReader = originalFileReader;
  });
});
