import { describe, it, expect } from 'vitest';
import { splitChapters, countChapters } from '../chapter-splitter';

describe('chapter-splitter', () => {
  // 中文格式
  it('中文标准章节切分（3章）', () => {
    const text = `第一章 风起\n\n内容1...\n\n第二章 云涌\n\n内容2...\n\n第三章 雷动\n\n内容3...`;
    const result = splitChapters(text);
    expect(result.success).toBe(true);
    expect(result.totalChapters).toBe(3);
    expect(result.chapters[0].title).toContain('第一章');
    expect(result.chapters[2].title).toContain('第三章');
  });

  // 中文数字格式
  it('中文数字章节（第X回/第X节）', () => {
    const text = `第一回 桃园结义\n内容...\n第二回 怒鞭督邮\n内容...\n第三回 讨董卓\n内容...`;
    const result = splitChapters(text);
    expect(result.success).toBe(true);
    expect(result.totalChapters).toBe(3);
  });

  // 英文格式
  it('英文 Chapter N 格式', () => {
    const text = `Chapter 1 The Beginning\n\nContent 1...\n\nChapter 2 The Middle\n\nContent 2...\n\nChapter 3 The End\n\nContent 3...`;
    const result = splitChapters(text);
    expect(result.success).toBe(true);
    expect(result.totalChapters).toBe(3);
  });

  // 混合格式
  it('中英混合章节', () => {
    const text = `第一章 开端\n内容1\n\nChapter 2 Middle\n内容2\n\n第三章 结局\n内容3`;
    const result = splitChapters(text);
    expect(result.success).toBe(true);
    expect(result.totalChapters).toBe(3);
  });

  // 空文本
  it('空文本返回失败', () => {
    const result = splitChapters('');
    expect(result.success).toBe(false);
    expect(result.message).toContain('为空');
  });

  // 少于3章也能正常切分
  it('仅2章也能正常切分', () => {
    const text = `第一章 起\n内容1\n\n第二章 承\n内容2`;
    const result = splitChapters(text);
    expect(result.success).toBe(true);
    expect(result.totalChapters).toBe(2);
    expect(result.chapters[0].title).toContain('第一章');
    expect(result.chapters[1].title).toContain('第二章');
  });

  // 仅1章也能正常切分
  it('仅1章也能正常切分', () => {
    const text = `第一章 起\n内容1`;
    const result = splitChapters(text);
    expect(result.success).toBe(true);
    expect(result.totalChapters).toBe(1);
    expect(result.chapters[0].title).toContain('第一章');
  });

  // 无章节标记
  it('无章节标记返回失败', () => {
    const text = '这是一段没有章节标记的文本，只是一段普通的文字内容。';
    const result = splitChapters(text);
    expect(result.success).toBe(false);
  });

  // 计数函数
  it('countChapters 正确计数', () => {
    const text = `第一章\n第二章\n第三章\n第四章`;
    expect(countChapters(text)).toBe(4);
  });

  // 字数统计
  it('章节字数统计正确', () => {
    const text = `第一章 测试\n\n短内容\n\n第二章 测试\n\n短内容2\n\n第三章 测试\n\n短内容3`;
    const result = splitChapters(text);
    expect(result.success).toBe(true);
    expect(result.chapters[0].charCount).toBeGreaterThan(0);
    expect(result.chapters[0].charCount).toContain;
    expect(result.chapters[0].content).toContain('第一章');
  });
});
