/**
 * Host-side hardening for model-written HTML.
 *
 * The document is only ever shown through <iframe sandbox="allow-scripts" srcdoc>,
 * which gives it an opaque origin: no cookies, no storage, no parent DOM access.
 * On top of that we prepend a Content-Security-Policy that denies every network
 * fetch, so "no external requests" is enforced by the browser and not only by
 * the fixture validator. The fixture itself is never modified.
 */
export const SANDBOX_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "media-src data: blob:",
  "font-src data:",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

export const SANDBOX_ATTR = "allow-scripts";

export function withCsp(document: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}">`;
  const head = /<head[^>]*>/i.exec(document);
  if (head) {
    const at = head.index + head[0].length;
    return document.slice(0, at) + meta + document.slice(at);
  }
  const doctype = /^\s*<!doctype[^>]*>/i.exec(document);
  if (doctype) {
    return doctype[0] + meta + document.slice(doctype[0].length);
  }
  return meta + document;
}
