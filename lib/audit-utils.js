import crypto from "node:crypto";
import { headers } from "next/headers";
import { recordAuditEvent } from "@/lib/compliance-store";

const RAW_AUDIT_CONTENT_ENABLED = process.env.BATUK_AUDIT_RAW_CONTENT_ENABLED === "true";
const RAW_AUDIT_CONTENT_LIMIT = Number(process.env.BATUK_AUDIT_RAW_CONTENT_LIMIT || 2000);

export function digestValue(value) {
  return crypto.createHash("sha256").update(String(value ?? "")).digest("hex");
}

export function summarizeText(value) {
  const text = String(value || "");
  return {
    sha256: digestValue(text),
    length: text.length,
    lineCount: text ? text.split(/\r\n|\r|\n/).length : 0,
    preview: RAW_AUDIT_CONTENT_ENABLED ? text.slice(0, RAW_AUDIT_CONTENT_LIMIT) : undefined,
  };
}

export function summarizeMessages(messages = []) {
  return messages.map((message, index) => {
    const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content || "");
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    return {
      index,
      role: message.role || "unknown",
      content: summarizeText(content),
      attachments: attachments.map((attachment, attachmentIndex) => ({
        index: attachmentIndex,
        kind: attachment.kind || "unknown",
        nameHash: attachment.name ? digestValue(attachment.name) : null,
        bytes: Number(attachment.size || 0),
        hasData: Boolean(attachment.data),
        text: attachment.text ? summarizeText(attachment.text) : undefined,
      })),
    };
  });
}

export function summarizeObject(value) {
  return summarizeText(JSON.stringify(value ?? null));
}

export function diffKeys(before = {}, after = {}) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  return Array.from(keys).filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]));
}

export async function requestAuditContext() {
  const headerList = await headers();
  return {
    ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || null,
    userAgent: headerList.get("user-agent") || null,
    requestId: headerList.get("x-request-id") || headerList.get("cf-ray") || null,
  };
}

export async function recordRequestAudit(event) {
  const context = await requestAuditContext();
  return recordAuditEvent({ ...event, ...context }).catch(() => null);
}
