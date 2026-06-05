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
  });

  describe('deleteProject', () => {
    it('删除后不再列出', () => {
      const p = createProject('test');
      deleteProject(p.id);
      expect(loadProject(p.id)).toBeNull();
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
