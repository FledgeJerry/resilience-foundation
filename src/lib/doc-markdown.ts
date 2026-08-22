function titleCase(key: string): string {
  const withSpaces = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ");
  return withSpaces.replace(/\b\w/g, (c) => c.toUpperCase());
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}

function renderTable(rows: Record<string, unknown>[]): string {
  const keys = Object.keys(rows[0]);
  const header = `| ${keys.map(titleCase).join(" | ")} |`;
  const divider = `| ${keys.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${keys.map((k) => formatValue(row[k])).join(" | ")} |`).join("\n");
  return [header, divider, body].join("\n");
}

function renderSection(key: string, value: unknown, level: number): string {
  if (value === null || value === undefined || value === "") return "";
  const heading = "#".repeat(Math.min(level, 6)) + " " + titleCase(key);

  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (typeof value[0] === "string" || typeof value[0] === "number") {
      const list = (value as (string | number)[]).map((v) => `- ${v}`).join("\n");
      return `${heading}\n\n${list}`;
    }
    if (isPlainObject(value[0])) {
      return `${heading}\n\n${renderTable(value as Record<string, unknown>[])}`;
    }
    return "";
  }

  if (isPlainObject(value)) {
    const nested = Object.entries(value)
      .map(([k, v]) => renderSection(k, v, level + 1))
      .filter(Boolean)
      .join("\n\n");
    if (!nested) return "";
    return `${heading}\n\n${nested}`;
  }

  return `${heading}\n\n${formatValue(value)}`;
}

/**
 * Best-effort markdown backup format for a generated document's structured JSON.
 * Not meant to match the polished on-screen render field-for-field.
 */
export function jsonToMarkdown(doc: Record<string, unknown>, title?: string): string {
  const sections = Object.entries(doc)
    .map(([key, value]) => renderSection(key, value, 2))
    .filter(Boolean);
  const heading = title ? `# ${title}\n\n` : "";
  return heading + sections.join("\n\n");
}
