/**
 * YAML 剧本批量校验脚本
 *
 * 用法：
 *   npx tsx scripts/validate-yaml.ts <yaml-file> [<yaml-file> ...]
 *
 * 功能：
 *   1. 读取 YAML 文件
 *   2. 用 js-yaml 解析
 *   3. 用 Ajv（JSON Schema Draft-07 + formats）校验
 *   4. 输出 ✅ 或详细错误列表
 *   5. 退出码：0=全部成功，1=至少一个失败
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import * as yaml from "js-yaml";

// 项目根目录：当前工作目录（运行时请用 `npx tsx scripts/validate-yaml.ts` 在项目根执行）。
// 这样避免依赖 import.meta.url，使脚本在 CommonJS 与 ESM 下都能通过 tsc 严格检查。
const projectRoot = process.cwd();

// Schema 路径（与源码保持相对，避免依赖 cwd）
const SCHEMA_PATH = resolve(projectRoot, "src/schema/script.schema.json");

interface ValidationError {
  file: string;
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params: Record<string, unknown>;
  message: string;
  snippet?: unknown;
}

/**
 * 加载并编译 JSON Schema（一次性）。
 * 编译失败会直接退出，因为这是开发期问题，不应被吞掉。
 */
function loadValidator(): ValidateFunction {
  if (!existsSync(SCHEMA_PATH)) {
    console.error(`❌ 找不到 Schema 文件: ${SCHEMA_PATH}`);
    console.error("   请确认 src/schema/script.schema.json 已创建。");
    process.exit(2);
  }

  const schemaText = readFileSync(SCHEMA_PATH, "utf-8");
  let schema: unknown;
  try {
    schema = JSON.parse(schemaText);
  } catch (err) {
    console.error(`❌ Schema 文件不是合法 JSON: ${(err as Error).message}`);
    process.exit(2);
  }

  const ajv = new Ajv({
    allErrors: true,
    strict: true,
    allowUnionTypes: true,
  });
  addFormats(ajv);

  try {
    return ajv.compile(schema);
  } catch (err) {
    console.error(`❌ Schema 编译失败（元校验不通过）:`);
    console.error(`   ${(err as Error).message}`);
    process.exit(2);
  }
}

/**
 * 校验单个 YAML 文件。
 * 返回 null 表示通过，否则返回错误数组。
 */
function validateFile(
  filePath: string,
  validate: ValidateFunction,
): ValidationError[] | null {
  if (!existsSync(filePath)) {
    return [
      {
        file: filePath,
        instancePath: "",
        schemaPath: "",
        keyword: "io",
        params: {},
        message: `文件不存在`,
      },
    ];
  }

  const text = readFileSync(filePath, "utf-8");

  // 1. YAML 解析
  let data: unknown;
  try {
    data = yaml.load(text);
  } catch (err) {
    const e = err as yaml.YAMLException;
    return [
      {
        file: filePath,
        instancePath: "",
        schemaPath: "",
        keyword: "yaml-parse",
        params: { line: e.mark?.line, column: e.mark?.column },
        message: `YAML 解析失败: ${e.reason}`,
      },
    ];
  }

  // 2. Schema 校验
  const valid = validate(data);
  if (valid) return null;

  const errors = (validate.errors ?? []).map((e) => ({
    file: filePath,
    instancePath: e.instancePath || "/",
    schemaPath: e.schemaPath,
    keyword: e.keyword,
    params: e.params as Record<string, unknown>,
    message: e.message ?? "(无消息)",
    snippet: extractSnippet(data, e.instancePath),
  }));
  return errors;
}

/** 根据 instancePath 从数据中取出对应位置的片段（帮助定位问题）。 */
function extractSnippet(root: unknown, instancePath: string): unknown {
  if (!instancePath) return undefined;
  const parts = instancePath.split("/").filter(Boolean);
  let cur: unknown = root;
  for (const part of parts) {
    if (cur && typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

function formatErrors(errors: ValidationError[]): string {
  return errors
    .map((e) => {
      const loc = e.instancePath ? `@ ${e.instancePath}` : "";
      const params = Object.keys(e.params).length
        ? ` ${JSON.stringify(e.params)}`
        : "";
      const snippet =
        e.snippet !== undefined
          ? `\n      当前值: ${JSON.stringify(e.snippet).slice(0, 200)}`
          : "";
      return `   ✗ [${e.keyword}] ${e.message}${loc}${params}${snippet}`;
    })
    .join("\n");
}

// ─── 入口 ────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.error("用法: npx tsx scripts/validate-yaml.ts <yaml-file> [<yaml-file> ...]");
  process.exit(2);
}

const validate = loadValidator();

let totalOk = 0;
let totalFail = 0;
const startedAt = Date.now();

for (const relPath of argv) {
  const absPath = resolve(process.cwd(), relPath);
  const errors = validateFile(absPath, validate);
  if (errors === null) {
    console.log(`✅ ${relPath} — YAML valid`);
    totalOk += 1;
  } else {
    console.error(`❌ ${relPath} — ${errors.length} 个错误:`);
    console.error(formatErrors(errors));
    totalFail += 1;
  }
}

const elapsed = Date.now() - startedAt;
console.log(
  `\n校验完成: ${totalOk} 通过 / ${totalFail} 失败 / ${argv.length} 总计 (${elapsed}ms)`,
);

process.exit(totalFail > 0 ? 1 : 0);
