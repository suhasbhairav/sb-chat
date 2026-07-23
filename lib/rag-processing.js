import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { makeId } from "@/lib/chat-utils";

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".tsv", ".json", ".log"]);
const EXCEL_EXTENSIONS = new Set([".xlsx", ".xls"]);
const execFileAsync = promisify(execFile);

function extensionFor(name) {
  const match = String(name || "").toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] || "";
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function worksheetToText(workbook) {
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return `# Sheet: ${sheetName}\n${csv}`;
  }).join("\n\n");
}

export async function extractDocumentText(filePath, fileName) {
  const ext = extensionFor(fileName);
  const buffer = await readFile(filePath);

  if (ext === ".pdf") {
    const { stdout } = await execFileAsync("pdftotext", ["-layout", filePath, "-"], {
      maxBuffer: 20 * 1024 * 1024,
    });
    return normalizeText(stdout);
  }

  if (ext === ".docx") {
    const parsed = await mammoth.extractRawText({ buffer });
    return normalizeText(parsed.value);
  }

  if (EXCEL_EXTENSIONS.has(ext)) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    return normalizeText(worksheetToText(workbook));
  }

  if (TEXT_EXTENSIONS.has(ext)) {
    return normalizeText(buffer.toString("utf8"));
  }

  throw new Error("Unsupported file type. Upload PDF, TXT, CSV, XLS, XLSX, DOCX, MD, JSON, or LOG files.");
}

function splitOversizedText(text, chunkSize, overlap) {
  const chunks = [];
  let cursor = 0;

  while (cursor < text.length) {
    const end = Math.min(text.length, cursor + chunkSize);
    chunks.push(text.slice(cursor, end).trim());
    if (end >= text.length) break;
    cursor = Math.max(end - overlap, cursor + 1);
  }

  return chunks.filter(Boolean);
}

export function chunkDocumentText(text, { chunkSize = 1800, chunkOverlap = 220 } = {}) {
  const paragraphs = normalizeText(text).split(/\n{2,}/).filter(Boolean);
  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > chunkSize) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = "";
      }
      chunks.push(...splitOversizedText(paragraph, chunkSize, chunkOverlap));
      continue;
    }

    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length <= chunkSize) {
      current = next;
      continue;
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }
    current = paragraph;
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.map((content, index) => ({
    id: makeId(),
    index,
    content,
  }));
}
