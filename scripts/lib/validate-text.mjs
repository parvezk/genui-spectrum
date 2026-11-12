// The text rendering is plain Markdown. react-markdown does not render raw
// HTML, so embedded tags would show up as literal text.
export function validateText(markdown) {
  const checks = ["is non-empty Markdown", "contains no raw HTML outside code (react-markdown would print it literally)"];
  const errors = [];
  const warnings = [];
  if (typeof markdown !== "string" || markdown.trim() === "") {
    errors.push({ code: "EMPTY", message: "The Markdown answer is empty." });
    return { valid: false, checks, errors, warnings };
  }
  const prose = markdown.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  const tag = /<\/?[a-z][a-z0-9]*(\s[^<>]*)?>/i.exec(prose);
  if (tag) errors.push({ code: "RAW_HTML", message: `Raw HTML tag ${tag[0]} would be shown as literal text.` });
  return { valid: errors.length === 0, checks, errors, warnings };
}
