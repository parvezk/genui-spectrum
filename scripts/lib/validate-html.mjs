// Static checks for a freeform HTML page that will run inside
// <iframe sandbox="allow-scripts" srcdoc>. The browser enforces the sandbox and
// a deny-all CSP at runtime; these checks record whether the page was written
// to live within them.
import vm from "node:vm";

const NAMESPACE_URIS = /https?:\/\/www\.w3\.org\/(2000\/svg|1999\/xhtml|1999\/xlink|1998\/Math\/MathML)/g;

function lineOf(doc, index) {
  return `line ${doc.slice(0, index).split("\n").length}`;
}

export function validateHtml(doc) {
  const checks = [];
  const errors = [];
  const warnings = [];
  const fail = (code, message, path) => errors.push(path ? { code, path, message } : { code, message });
  const warn = (code, message, path) => warnings.push(path ? { code, path, message } : { code, message });
  const done = () => ({ valid: errors.length === 0, checks, errors, warnings });

  checks.push("is one complete HTML document");
  if (typeof doc !== "string" || doc.trim() === "") {
    fail("EMPTY", "The page is empty.");
    return done();
  }
  if (!/^\s*<!doctype html>/i.test(doc)) fail("NO_DOCTYPE", "The page does not start with <!doctype html>.");
  if ((doc.match(/<html[\s>]/gi) ?? []).length !== 1 || !/<body[\s>]/i.test(doc)) {
    fail("NOT_ONE_DOCUMENT", "Expected exactly one <html> element with a <body>.");
  }

  checks.push("makes no external requests (no remote src/href/url(), no fetch/XHR/WebSocket, no imports, no navigation)");
  const stripped = doc.replace(NAMESPACE_URIS, "");
  // Attributes are only checked inside tags, so `const data = ...` in a script is not mistaken for one.
  const markup = stripped.replace(/(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi, (_, open, _tag, body, close) => open + body.replace(/[^\n]/g, " ") + close);
  for (const tag of markup.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    for (const attr of tag[2].matchAll(/(?:^|\s)(src|srcset|href|xlink:href|poster|action|formaction|data|background)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      const value = (attr[2] ?? attr[3] ?? attr[4] ?? "").trim();
      if (value === "" || /^(data:|blob:|#)/i.test(value)) continue;
      fail("EXTERNAL_REFERENCE", `<${tag[1]} ${attr[1]}="${value.slice(0, 60)}"> points outside the document.`, lineOf(markup, tag.index));
    }
  }
  const requestPatterns = [
    [/https?:\/\/[^\s"'<>)]+/gi, "EXTERNAL_URL", "absolute URL"],
    [/url\(\s*["']?(?!data:|#|["']?\))/gi, "EXTERNAL_CSS_URL", "CSS url() that is not a data: URI"],
    [/@import\b/gi, "CSS_IMPORT", "CSS @import"],
    [/\bfetch\s*\(|XMLHttpRequest|\bWebSocket\b|\bEventSource\b|sendBeacon|importScripts|\bimport\s*\(|new\s+(?:Shared)?Worker\b/gi, "NETWORK_API", "network or module-loading API"],
    [/\blocation\s*\.\s*(?:href|assign|replace)\b|\blocation\s*=[^=]/gi, "NAVIGATION", "navigation away from the document"],
    [/\.(?:src|href|action|poster)\s*=\s*(?!["'`](?:data:|blob:|#))/gi, "DYNAMIC_REFERENCE", "script-assigned URL that is not a data: URI"],
  ];
  for (const [pattern, code, what] of requestPatterns) {
    for (const m of stripped.matchAll(pattern)) fail(code, `Found ${what}: ${m[0].slice(0, 80)}`, lineOf(stripped, m.index));
  }

  checks.push('uses nothing that sandbox="allow-scripts" blocks (storage, cookies, modals, popups, parent access, form submission)');
  const sandboxPatterns = [
    [/\b(?:localStorage|sessionStorage|indexedDB)\b|document\.cookie/g, "BLOCKED_STORAGE", "storage or cookies throw in an opaque origin"],
    [/(?<![\w.])(?:alert|confirm|prompt)\s*\(/g, "BLOCKED_MODAL", "modal dialogs are blocked without allow-modals"],
    [/window\.open\s*\(|target\s*=\s*["']?_blank/g, "BLOCKED_POPUP", "popups are blocked without allow-popups"],
    [/\b(?:window\.)?(?:parent|top)\.(?:document|location|postMessage)|\bwindow\.(?:parent|top)\b/g, "PARENT_ACCESS", "reaches for the embedding page"],
  ];
  for (const [pattern, code, why] of sandboxPatterns) {
    for (const m of doc.matchAll(pattern)) fail(code, `${m[0].trim()} — ${why}.`, lineOf(doc, m.index));
  }
  for (const m of doc.matchAll(/<form\b/gi)) {
    warn("FORM_ELEMENT", "<form> submission is blocked without allow-forms; pressing Enter in a field may log a console error.", lineOf(doc, m.index));
  }

  checks.push("every inline script parses");
  let scripts = 0;
  for (const m of doc.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    scripts += 1;
    if (/type\s*=\s*["']?(?:application\/json|text\/template)/i.test(m[1])) continue;
    try {
      new vm.Script(m[2]);
    } catch (e) {
      fail("SCRIPT_SYNTAX", e instanceof Error ? e.message : String(e), lineOf(doc, m.index));
    }
  }

  checks.push("is interactive (has a script that listens for user input)");
  const interactive = scripts > 0 && /addEventListener\s*\(|\bon(?:click|input|change|keydown|keyup|submit|pointerdown|mouseover|mousemove)\s*=/i.test(doc);
  if (!interactive) fail("NOT_INTERACTIVE", "No script handles user input, so the page is static.");

  return done();
}
