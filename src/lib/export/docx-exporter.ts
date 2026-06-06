/**
 * Word (.docx) 文档导出工具
 * 使用 docx 库在客户端生成格式化的剧本文档
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  type IParagraphOptions,
} from 'docx';
import { saveAs } from 'file-saver';
import type { Script } from '@/schema/script.schema';

interface ExportOptions {
  filename?: string;
}

/**
 * 将 Script 数据导出为 .docx 文件并下载
 */
export async function exportToDocx(
  data: Script,
  options: ExportOptions = {},
): Promise<void> {
  const paragraphs: IParagraphOptions[] = [];

  // 剧本标题
  paragraphs.push({
    children: [
      new TextRun({
        text: data.script.title || '未命名剧本',
        bold: true,
        size: 36, // 18pt
        font: 'Microsoft YaHei',
      }),
    ],
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  });

  // 元信息
  const metaParts: string[] = [];
  if (data.script.source) metaParts.push(`原著：${data.script.source}`);
  if (data.script.adapted_at) metaParts.push(`改编日期：${data.script.adapted_at}`);
  if (data.script.adapter) metaParts.push(`改编者：${data.script.adapter}`);
  if (data.metadata?.genre) metaParts.push(`类型：${data.metadata.genre}`);

  if (metaParts.length > 0) {
    paragraphs.push({
      children: [
        new TextRun({
          text: metaParts.join('  |  '),
          size: 20, // 10pt
          color: '666666',
          font: 'Microsoft YaHei',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    });
  }

  // 角色列表
  if (data.metadata?.characters && data.metadata.characters.length > 0) {
    paragraphs.push({
      children: [
        new TextRun({
          text: `角色：${data.metadata.characters.join('、')}`,
          size: 22, // 11pt
          italics: true,
          color: '444444',
          font: 'Microsoft YaHei',
        }),
      ],
      spacing: { after: 100 },
    });
  }

  if (data.metadata?.summary) {
    paragraphs.push({
      children: [
        new TextRun({
          text: data.metadata.summary,
          size: 22,
          color: '555555',
          font: 'Microsoft YaHei',
        }),
      ],
      spacing: { after: 400 },
    });
  }

  // 分隔线
  paragraphs.push({
    children: [],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
    spacing: { after: 400 },
  });

  // 幕 / 场 / 台词
  for (const act of data.acts) {
    // 幕标题
    paragraphs.push({
      children: [
        new TextRun({
          text: act.title || `第 ${act.act_number} 幕`,
          bold: true,
          size: 32, // 16pt
          font: 'Microsoft YaHei',
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    });

    for (const scene of act.scenes) {
      // 场景标题
      const sceneHeader = [
        `场景 ${scene.scene_number}`,
        scene.location ? ` — ${scene.location}` : '',
        scene.time ? `（${scene.time}）` : '',
      ].join('');

      paragraphs.push({
        children: [
          new TextRun({
            text: sceneHeader,
            bold: true,
            size: 26, // 13pt
            color: '333333',
            font: 'Microsoft YaHei',
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      });

      // 场景描述
      if (scene.description) {
        paragraphs.push({
          children: [
            new TextRun({
              text: scene.description,
              italics: true,
              size: 22,
              color: '666666',
              font: 'Microsoft YaHei',
            }),
          ],
          spacing: { after: 150 },
        });
      }

      // 在场角色
      if (scene.characters_present.length > 0) {
        paragraphs.push({
          children: [
            new TextRun({
              text: `在场：${scene.characters_present.join('、')}`,
              size: 20,
              color: '888888',
              font: 'Microsoft YaHei',
            }),
          ],
          spacing: { after: 150 },
        });
      }

      // 台词
      for (const dialogue of scene.dialogues) {
        const characterName = dialogue.character || '未知角色';
        const typeLabel = dialogue.type ? `（${dialogue.type}）` : '';

        // 角色名行
        paragraphs.push({
          children: [
            new TextRun({
              text: `${characterName}${typeLabel}`,
              bold: true,
              size: 22,
              color: dialogue.type === '旁白' ? '888888' : dialogue.type === '动作' ? 'B8860B' : '4B0082',
              font: 'Microsoft YaHei',
            }),
          ],
          spacing: { before: 150, after: 50 },
        });

        // 台词内容
        paragraphs.push({
          children: [
            new TextRun({
              text: dialogue.content || '',
              size: 22,
              font: 'Microsoft YaHei',
              italics: dialogue.type === '旁白',
            }),
          ],
          indent: { left: 400 },
          spacing: { after: 50 },
        });

        // 动作/表情指示
        if (dialogue.action) {
          paragraphs.push({
            children: [
              new TextRun({
                text: `※ ${dialogue.action}`,
                size: 20,
                italics: true,
                color: 'B8860B',
                font: 'Microsoft YaHei',
              }),
            ],
            indent: { left: 400 },
            spacing: { after: 100 },
          });
        }
      }
    }
  }

  // 创建文档
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,    // 1 inch
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: paragraphs.map((p) => new Paragraph(p)),
    }],
  });

  // 生成并下载
  const blob = await Packer.toBlob(doc);
  const filename = options.filename || `剧本-${data.script.title || 'export'}-${new Date().toISOString().slice(0, 10)}.docx`;
  saveAs(blob, filename);
}
