import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage + window for SSR-safe code
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });
Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true });

import {
  listProjects,
  createProject,
  loadProject,
  saveProject,
  deleteProject,
  renameProject,
  saveNovelText,
  loadNovelText,
  saveYamlContent,
  loadYamlContent,
  type Project,
} from '../storage';

describe('storage utils', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('createProject', () => {
    it('创建项目并返回完整对象', () => {
      const p = createProject('测试小说.txt');
      expect(p.name).toBe('测试小说.txt');
      expect(p.id).toBeTruthy();
      expect(p.status).toBe('uploaded');
      expect(p.chapterCount).toBe(0);
      expect(p.createdAt).toBeTruthy();
    });
  });

  describe('listProjects', () => {
    it('空列表返回空数组', () => {
      expect(listProjects()).toEqual([]);
    });

    it('创建后可列出', () => {
      createProject('小说A');
      createProject('小说B');
      const list = listProjects();
      expect(list.length).toBe(2);
    });
  });

  describe('loadProject', () => {
    it('存在的项目可加载', () => {
      const p = createProject('test');
      const loaded = loadProject(p.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe('test');
    });

    it('不存在的 ID 返回 null', () => {
      expect(loadProject('nonexistent')).toBeNull();
    });
  });

  describe('saveProject', () => {
    it('更新已有项目', () => {
      const p = createProject('test');
      p.status = 'converted';
      p.chapterCount = 5;
      saveProject(p);
      const loaded = loadProject(p.id);
      expect(loaded!.status).toBe('converted');
      expect(loaded!.chapterCount).toBe(5);
    });

    it('对不存在的 ID 会 push 新项目而非覆盖', () => {
      // 构造一个不在列表中的项目
      const newProject: Project = {
        id: 'manual-id-999',
        name: '手动添加的项目',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        status: 'uploaded',
        chapterCount: 0,
      };
      saveProject(newProject);

      // 验证可加载
      const loaded = loadProject('manual-id-999');
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe('手动添加的项目');
    });

    it('saveProject 自动更新 updatedAt', async () => {
      const p = createProject('test');
      const originalUpdatedAt = p.updatedAt;
      // 等待至少 1ms 确保时间戳不同
      await new Promise((resolve) => setTimeout(resolve, 10));
      saveProject(p);
      const loaded = loadProject(p.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('deleteProject', () => {
    it('删除后不再列出', () => {
      const p = createProject('test');
      deleteProject(p.id);
      expect(loadProject(p.id)).toBeNull();
    });

    it('删除不存在的 ID 不报错', () => {
      expect(() => deleteProject('nonexistent-id-999')).not.toThrow();
    });

    it('删除项目后其他项目仍然存在', () => {
      const p1 = createProject('项目1');
      const p2 = createProject('项目2');
      deleteProject(p1.id);
      // p2 应该还在
      const loaded2 = loadProject(p2.id);
      expect(loaded2).not.toBeNull();
      expect(loaded2!.name).toBe('项目2');
      // p1 应该不在了
      expect(loadProject(p1.id)).toBeNull();
    });
  });

  describe('renameProject', () => {
    it('正确重命名项目', () => {
      const p = createProject('测试项目');
      renameProject(p.id, '新名称');
      const loaded = loadProject(p.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe('新名称');
    });

    it('重命名后列表中体现新名称', () => {
      const p = createProject('旧名称');
      renameProject(p.id, '新名称');
      const list = listProjects();
      const target = list.find((item) => item.id === p.id);
      expect(target?.name).toBe('新名称');
    });

    it('重命名不存在的项目不报错', () => {
      expect(() => renameProject('nonexistent-id', '新名称')).not.toThrow();
    });

    it('重命名后 updatedAt 更新', async () => {
      const p = createProject('测试');
      const originalTime = p.updatedAt;
      // 等待至少 1ms 确保时间戳不同
      await new Promise((resolve) => setTimeout(resolve, 10));
      renameProject(p.id, '新名称');
      const loaded = loadProject(p.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.updatedAt).not.toBe(originalTime);
    });

    it('重命名不影响其它项目字段', () => {
      const p = createProject('测试');
      const originalCreatedAt = p.createdAt;
      const originalStatus = p.status;
      const originalChapterCount = p.chapterCount;
      renameProject(p.id, '新名称');
      const loaded = loadProject(p.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.createdAt).toBe(originalCreatedAt);
      expect(loaded!.status).toBe(originalStatus);
      expect(loaded!.chapterCount).toBe(originalChapterCount);
    });
  });

  describe('novel text storage', () => {
    it('保存和读取小说文本', () => {
      saveNovelText('id1', '小说正文内容...');
      expect(loadNovelText('id1')).toBe('小说正文内容...');
    });

    it('不存在的 key 返回 null', () => {
      expect(loadNovelText('nonexistent')).toBeNull();
    });
  });

  describe('YAML content storage', () => {
    it('保存和读取 YAML', () => {
      saveYamlContent('id1', 'script:\n  title: Test');
      expect(loadYamlContent('id1')).toBe('script:\n  title: Test');
    });
  });
});
