#!/usr/bin/env node
// Assembles /fixtures from the saved generation outputs in /generation.
//
// Each rendering is validated exactly as it was generated and the result is
// stored next to it. Nothing is repaired here: a rendering that fails stays in
// the fixture with its errors, and the app shows the failure.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateA2ui, A2UI_VERSION, BASIC_CATALOG_ID } from "./lib/validate-a2ui.mjs";
import { validateAgui } from "./lib/validate-agui.mjs";
import { validateHtml } from "./lib/validate-html.mjs";
import { validateText } from "./lib/validate-text.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const genDir = path.join(root, "generation");
const outDir = path.join(root, "fixtures");

const GENERATION = {
  generator: "Claude",
  method:
    "Written directly by Claude in an agent session, one pass per rendering. No model API is called from code, at build time or at runtime.",
};

const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null);

function parseJson(raw, label) {
  if (raw === null) return { value: null, error: `${label} is missing.` };
  try {
    return { value: JSON.parse(raw), error: null };
  } catch (e) {
    return { value: null, error: `${label} is not valid JSON: ${e.message}` };
  }
}

function failed(code, message) {
  return { valid: false, checks: ["output parses"], errors: [{ code, message }], warnings: [] };
}

const { prompts } = JSON.parse(fs.readFileSync(path.join(root, "prompts", "prompts.json"), "utf8"));
fs.mkdirSync(outDir, { recursive: true });

const summaries = [];
const report = [];

prompts.forEach((p, i) => {
  const dir = path.join(genDir, p.id);
  if (!fs.existsSync(dir)) {
    report.push(`${p.id}: not generated yet, skipped`);
    return;
  }

  const markdown = read(path.join(dir, "text.md")) ?? "";
  const text = { markdown, validation: validateText(markdown) };

  const a2uiParsed = parseJson(read(path.join(dir, "a2ui.json")), "a2ui.json");
  const a2ui = a2uiParsed.error
    ? { messages: [], validation: failed("PARSE_ERROR", a2uiParsed.error) }
    : { messages: a2uiParsed.value, validation: validateA2ui(a2uiParsed.value) };

  const document = read(path.join(dir, "page.html")) ?? "";
  const html = { document, validation: validateHtml(document) };

  const aguiParsed = parseJson(read(path.join(dir, "agui.json")), "agui.json");
  const agui = aguiParsed.error
    ? {
        toolCall: { id: "", name: "generateUserInterface", arguments: { description: "", data: {}, output: {} } },
        ui: { schema: {}, uiSchema: {}, initialData: {} },
        validation: failed("PARSE_ERROR", aguiParsed.error),
      }
    : { ...aguiParsed.value, validation: validateAgui(aguiParsed.value) };

  const notesParsed = parseJson(read(path.join(dir, "notes.json")), "notes.json");
  const notes = { text: "", a2ui: "", html: "", agui: "", ...(notesParsed.value ?? {}) };
  for (const key of ["text", "a2ui", "html", "agui"]) {
    if (typeof notes[key] !== "string" || !notes[key].trim() || notes[key].includes("\n")) {
      throw new Error(`${p.id}: notes.${key} must be exactly one non-empty line`);
    }
  }

  const fixture = {
    id: p.id,
    index: i + 1,
    title: p.title,
    category: p.category,
    prompt: p.prompt,
    generation: GENERATION,
    text,
    a2ui,
    html,
    agui,
    notes,
  };
  fs.writeFileSync(path.join(outDir, `${p.id}.json`), JSON.stringify(fixture, null, 2) + "\n");

  const valid = {
    text: text.validation.valid,
    a2ui: a2ui.validation.valid,
    html: html.validation.valid,
    agui: agui.validation.valid,
  };
  summaries.push({ id: p.id, index: i + 1, title: p.title, category: p.category, prompt: p.prompt, valid });

  const marks = Object.entries(valid).map(([k, ok]) => `${k}:${ok ? "ok" : "FAIL"}`);
  const warns = [text, a2ui, html, agui].reduce((n, r) => n + r.validation.warnings.length, 0);
  report.push(`${p.id}: ${marks.join(" ")}${warns ? ` (${warns} warning${warns > 1 ? "s" : ""})` : ""}`);
  for (const [name, r] of Object.entries({ text, a2ui, html, agui })) {
    for (const e of r.validation.errors) report.push(`    ${name} ${e.code}${e.path ? ` @ ${e.path}` : ""}: ${e.message}`);
    for (const w of r.validation.warnings) report.push(`    ${name} warning ${w.code}${w.path ? ` @ ${w.path}` : ""}: ${w.message}`);
  }
});

const index = {
  a2ui: { version: A2UI_VERSION, catalogId: BASIC_CATALOG_ID },
  generation: GENERATION,
  fixtures: summaries,
};
fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index, null, 2) + "\n");

console.log(report.join("\n"));
const count = (k) => summaries.filter((s) => !s.valid[k]).length;
console.log(
  `\n${summaries.length}/${prompts.length} fixtures written. Failures — text: ${count("text")}, a2ui: ${count("a2ui")}, html: ${count("html")}, agui: ${count("agui")}`,
);
