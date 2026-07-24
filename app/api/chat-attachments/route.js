import { unlink } from "node:fs/promises";
import { json } from "@/lib/chat-request";
import { makeId } from "@/lib/chat-utils";
import { extractDocumentText } from "@/lib/rag-processing";
import { saveUploadedDocumentFile } from "@/lib/rag-store";
import { requireServerSession } from "@/lib/auth-session";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_FILES = 8;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

function isImage(file) {
  return IMAGE_TYPES.has(file.type);
}

async function imageAttachment(file) {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`${file.name} is too large. Images can be up to 8 MB.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    id: makeId(),
    name: file.name,
    type: file.type || "application/octet-stream",
    size: buffer.length,
    kind: "image",
    data: `data:${file.type};base64,${buffer.toString("base64")}`,
  };
}

async function documentAttachment(file) {
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error(`${file.name} is too large. Documents can be up to 25 MB.`);
  }

  const saved = await saveUploadedDocumentFile(file);

  try {
    const text = await extractDocumentText(saved.filePath, file.name);

    return {
      id: makeId(),
      name: file.name,
      type: file.type || "application/octet-stream",
      size: saved.size,
      kind: "document",
      text: text.slice(0, 30000),
    };
  } finally {
    await unlink(saved.filePath).catch(() => {});
  }
}

export async function POST(request) {
  try {
    const { response } = await requireServerSession();
    if (response) return response;

    const formData = await request.formData();
    const files = formData.getAll("files").filter((file) => file?.name);

    if (!files.length) {
      return json({ error: "Choose at least one file to upload." }, 400);
    }

    if (files.length > MAX_FILES) {
      return json({ error: `Upload up to ${MAX_FILES} files at a time.` }, 400);
    }

    const attachments = [];

    for (const file of files) {
      attachments.push(isImage(file) ? await imageAttachment(file) : await documentAttachment(file));
    }

    return json({ attachments });
  } catch (error) {
    return json({ error: error.message || "Could not process attachments." }, 500);
  }
}
