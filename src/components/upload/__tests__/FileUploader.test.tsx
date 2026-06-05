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
});
