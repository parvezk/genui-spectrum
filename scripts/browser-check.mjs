#!/usr/bin/env node
// Opens every prompt page in headless Chromium and records what actually
// happened in each panel: did it paint, did it throw, did it try to reach the
// network, and did it respond to input. Results go to fixtures/browser-check.json,
// which the Findings page reads. Nothing here changes a rendering.
//
// Usage: pnpm build && pnpm start -p 3111 &   then   pnpm check:browser
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAjv } from "@jsonforms/core";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.BASE_URL ?? "http://localhost:3111";
const index = JSON.parse(fs.readFileSync(path.join(root, "fixtures", "index.json"), "utf8"));

/** Text of an element including open shadow roots (the A2UI catalog renders custom elements). */
const deepText = (el) => {
  const walk = (node) => {
    let out = "";
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return "";
    if (node.shadowRoot) out += walk(node.shadowRoot);
    for (const child of node.childNodes) out += walk(child);
    return out;
  };
  return walk(el).replace(/\s+/g, " ").trim();
};

/** Tries a handful of ordinary inputs inside the HTML page and reports whether the page reacted. */
async function exerciseHtml(frame) {
  return frame.evaluate(async () => {
    const snapshot = () => {
      const fields = [...document.querySelectorAll("input, select, textarea")].map((n) => `${n.checked}|${n.value}`).join(",");
      return document.body.innerHTML + fields;
    };
    const settle = () => new Promise((r) => setTimeout(r, 120));
    const tried = [];
    const attempt = async (name, act) => {
      const before = snapshot();
      try {
        act();
      } catch (e) {
        tried.push(`${name}: threw ${e.message}`);
        return false;
      }
      await settle();
      const changed = snapshot() !== before;
      tried.push(`${name}: ${changed ? "page updated" : "no change"}`);
      return changed;
    };
    const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
    let reacted = false;

    const range = document.querySelector("input[type=range]");
    if (range) {
      reacted = (await attempt("drag slider", () => {
        range.value = range.value === range.max ? range.min : range.max;
        fire(range, "input");
        fire(range, "change");
      })) || reacted;
    }
    const text = document.querySelector("input[type=search], input[type=text], input[type=number], textarea");
    if (text) {
      reacted = (await attempt("type in field", () => {
        text.value = text.type === "number" ? "7" : "an";
        fire(text, "input");
        fire(text, "change");
      })) || reacted;
    }
    // The first button is often an already-selected filter, so try a few before concluding nothing reacts.
    const buttons = [...document.querySelectorAll("button")].filter((b) => !b.disabled).slice(0, 6);
    for (const button of buttons) {
      const label = button.getAttribute("aria-label") || button.textContent.trim();
      if (await attempt(`click "${label.slice(0, 24)}"`, () => button.click())) {
        reacted = true;
        break;
      }
    }
    const box = document.querySelector("input[type=checkbox]:not(:disabled)");
    if (box) reacted = (await attempt("toggle checkbox", () => box.click())) || reacted;

    return { reacted, tried };
  });
}

/** Fills an A2UI form with plausible values: one option per empty picker, and text chosen from each field's label. */
async function fillA2uiForm(surface) {
  const pickers = surface.locator(".a2ui-choice-picker");
  for (let i = 0; i < (await pickers.count()); i++) {
    const picker = pickers.nth(i);
    const chosen = await picker.locator('[aria-pressed="true"], input:checked').count();
    if (chosen > 0) continue;
    const option = picker.locator("button, input").first();
    if ((await option.count()) > 0) await option.click();
  }
  const fields = surface.locator("input[type=text], input[type=number], input[type=date], input[type=time], input[type=datetime-local], textarea");
  for (let i = 0; i < (await fields.count()); i++) {
    const field = fields.nth(i);
    if ((await field.inputValue()) !== "") continue;
    const type = (await field.getAttribute("type")) ?? "text";
    const label = await field.evaluate((el) => el.parentElement?.closest("*")?.querySelector("label")?.textContent ?? "");
    let value = "Test value";
    if (type === "date") value = "2030-06-15";
    else if (type === "time") value = "19:30";
    else if (type === "datetime-local") value = "2030-06-15T19:30";
    else if (type === "number") value = "4";
    else if (/phone/i.test(label)) value = "+1 555 0142";
    else if (/e-?mail/i.test(label)) value = "ana@example.com";
    else if (/version/i.test(label)) value = "4.2.1";
    await field.fill(value);
  }
}

/** Fills the empty controls of a JSON Forms (Material) form: pickers, text fields, selects and radio groups. */
async function fillJsonForm(panel, page) {
  // Date and time pickers are sectioned fields: focus the first section and type through them.
  const pickers = panel.locator(".MuiPickersInputBase-root");
  for (let i = 0; i < (await pickers.count()); i++) {
    const picker = pickers.nth(i);
    if ((await picker.locator("input").first().inputValue()) !== "") continue;
    const sections = picker.locator("[role=spinbutton]");
    const typed = { Year: "2030", Month: "06", Day: "15", Hours: "07", Minutes: "30", Seconds: "00", Meridiem: "PM" };
    for (let k = 0; k < (await sections.count()); k++) {
      const section = sections.nth(k);
      const name = (await section.getAttribute("aria-label")) ?? "";
      await section.click();
      await page.keyboard.type(typed[name] ?? "01");
    }
  }
  const radios = panel.locator("[role=radiogroup]");
  for (let i = 0; i < (await radios.count()); i++) {
    const group = radios.nth(i);
    if ((await group.locator("input:checked").count()) === 0) await group.locator("input[type=radio]").first().check();
  }
  const fields = panel.locator("input[type=text]:not(.MuiPickersInputBase-input), input[type=number], textarea:not([aria-hidden])");
  for (let i = 0; i < (await fields.count()); i++) {
    const field = fields.nth(i);
    if (!(await field.isVisible()) || !(await field.isEnabled()) || (await field.inputValue()) !== "") continue;
    const id = (await field.getAttribute("id")) ?? "";
    if ((await field.getAttribute("role")) === "combobox") {
      await field.click();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      continue;
    }
    let value = "Test value for this field";
    if ((await field.getAttribute("type")) === "number") value = "3";
    else if (/phone/i.test(id)) value = "+1 555 0142";
    else if (/email/i.test(id)) value = "ana@example.com";
    else if (/version/i.test(id)) value = "4.2.1";
    await field.fill(value);
  }
  await page.keyboard.press("Escape");
}

function expectedSubmitValid(fixture) {
  // The same Ajv setup JSON Forms uses in the panel, so "expected" means expected of that renderer.
  const ajv = createAjv();
  const data = fixture.agui.ui.initialData;
  return ajv.validate(fixture.agui.ui.schema, data) && ajv.validate(fixture.agui.toolCall.arguments.output, data);
}

const browser = await chromium.launch();
const results = {};

for (const summary of index.fixtures) {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, "fixtures", `${summary.id}.json`), "utf8"));
  const page = await browser.newPage({ viewport: { width: 1680, height: 1000 } });
  const consoleErrors = [];
  const pageErrors = [];
  const external = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 300)));
  page.on("pageerror", (e) => pageErrors.push(String(e.message ?? e).slice(0, 300)));
  page.on("request", (r) => {
    const url = r.url();
    if (!url.startsWith(base) && !/^(data|blob|about):/.test(url)) external.push(url.slice(0, 200));
  });

  await page.goto(`${base}/p/${summary.id}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const result = {};

  // 1. Text
  {
    const panel = page.locator('[data-testid="panel-text"]');
    const length = fixture.text.validation.valid ? (await panel.locator(".md").innerText()).trim().length : 0;
    result.text = { rendered: length > 80, problems: length > 80 ? [] : ["Rendered almost no text."], observed: [`${length} characters of rendered text`] };
  }

  // 2. A2UI
  {
    const panel = page.locator('[data-testid="panel-a2ui"]');
    const problems = [];
    const observed = [];
    if (!fixture.a2ui.validation.valid) {
      result.a2ui = { rendered: false, problems: ["Not rendered: failed validation."], observed };
    } else {
      const surface = panel.locator(".a2ui-light");
      const text = await surface.evaluate(deepText);
      const errorCount = await surface.locator("ul.text-red-800 li").count();
      observed.push(`${text.length} characters of rendered text`);
      if (text.length < 40) problems.push("The surface rendered blank or nearly blank.");
      if (errorCount > 0) problems.push(`The renderer reported ${errorCount} processing error(s).`);
      if (/\$\{|\[object Object\]|undefined|NaN/.test(text)) {
        problems.push(`Unresolved value in rendered text: "${(/.{0,30}(\$\{|\[object Object\]|undefined|NaN).{0,30}/.exec(text) ?? [""])[0]}"`);
      }

      const hasButton = fixture.a2ui.messages.some((m) => m.updateComponents?.components.some((c) => c.component === "Button"));
      if (hasButton) {
        // Real Button components only; ChoicePicker chips and tabs are buttons too.
        const buttons = surface.locator("button.a2ui-button");
        const lastEnabled = async () => {
          for (let i = (await buttons.count()) - 1; i >= 0; i--) {
            const b = buttons.nth(i);
            if ((await b.isVisible()) && (await b.isEnabled())) return b;
          }
          return null;
        };
        let target = await lastEnabled();
        if (!target) {
          // Every button is held back by its checks. Complete the form the way a user would, then try again.
          await fillA2uiForm(surface);
          await page.waitForTimeout(300);
          target = await lastEnabled();
          if (target) observed.push("Buttons were disabled by their checks until the form was filled with test values.");
          else problems.push("Buttons stayed disabled after filling every field with valid test values.");
        }
        if (target) {
          const label = (await target.innerText()).trim();
          await target.click();
          await page.waitForTimeout(300);
          // A Modal trigger opens a page-wide overlay. Note it, then close it so the other panels can be reached.
          const overlay = page.locator(".a2ui-modal-overlay");
          if ((await overlay.count()) > 0 && (await overlay.first().isVisible())) {
            observed.push(`"${label}" opened a modal.`);
            await page.keyboard.press("Escape");
            await page.waitForTimeout(200);
            if ((await overlay.count()) > 0 && (await overlay.first().isVisible())) {
              await overlay.first().click({ position: { x: 4, y: 4 } });
              await page.waitForTimeout(200);
            }
            if ((await overlay.count()) > 0 && (await overlay.first().isVisible())) problems.push("The modal could not be closed with Escape or by clicking outside it.");
          }
          const log = panel.locator('[data-testid="a2ui-actions"] pre');
          if ((await log.count()) > 0) observed.push(`"${label}" dispatched: ${(await log.innerText()).replace(/\s+/g, " ").slice(0, 400)}`);
          else problems.push(`Clicking "${label}" dispatched no event.`);
        }
      }
      result.a2ui = { rendered: problems.length === 0, problems, observed };
    }
  }

  // 3. Freeform HTML
  {
    const problems = [];
    const observed = [];
    if (!fixture.html.validation.valid) {
      result.html = { rendered: false, problems: ["Not rendered: failed validation."], observed };
    } else {
      const element = await page.locator('[data-testid="panel-html"] iframe').elementHandle();
      const sandbox = await element.getAttribute("sandbox");
      if (sandbox !== "allow-scripts") problems.push(`iframe sandbox is "${sandbox}", expected "allow-scripts".`);
      const frame = await element.contentFrame();
      const length = (await frame.evaluate(() => document.body.innerText)).trim().length;
      observed.push(`${length} characters of rendered text`);
      if (length < 40) problems.push("The page rendered blank or nearly blank.");
      const { reacted, tried } = await exerciseHtml(frame);
      observed.push(...tried);
      if (!reacted) problems.push("The page did not respond to any input that was tried.");
      result.html = { rendered: problems.length === 0, problems, observed };
    }
  }

  // 4. AG-UI
  {
    const panel = page.locator('[data-testid="panel-agui"]');
    const problems = [];
    const observed = [];
    if (!fixture.agui.validation.valid) {
      result.agui = { rendered: false, problems: ["Not rendered: failed validation."], observed };
    } else {
      const controls = await panel.locator("input, [role=combobox], [role=radio], textarea").count();
      observed.push(`${controls} form controls`);
      if (controls === 0) problems.push("JSON Forms rendered no controls.");
      await panel.getByRole("button", { name: "Submit", exact: true }).click();
      await page.waitForTimeout(400);
      const valid = (await panel.locator('[data-testid="agui-result"]').count()) > 0;
      const invalid = (await panel.locator('[data-testid="agui-errors"]').count()) > 0;
      const expected = expectedSubmitValid(fixture);
      if (!valid && !invalid) problems.push("Submit showed neither validated data nor errors.");
      else if (valid !== expected) problems.push(`Submit with the initial data was ${valid ? "accepted" : "rejected"}, but the schemas say it should be ${expected ? "accepted" : "rejected"}.`);
      observed.push(
        valid
          ? "Submit with the initial data: accepted, validated data shown"
          : `Submit with the initial data: rejected (${(await panel.locator('[data-testid="agui-errors"] li').allInnerTexts()).slice(0, 3).join("; ")})`,
      );
      if (invalid) {
        // A form that starts incomplete must still be completable: fill it and submit again.
        // A Categorization shows one tab at a time, so visit each tab and fill what it holds.
        const tabs = panel.locator("[role=tab]");
        const tabCount = await tabs.count();
        if (tabCount === 0) await fillJsonForm(panel, page);
        for (let t = 0; t < tabCount; t++) {
          await tabs.nth(t).click();
          await page.waitForTimeout(200);
          await fillJsonForm(panel, page);
        }
        await page.waitForTimeout(300);
        await panel.getByRole("button", { name: "Submit", exact: true }).click();
        await page.waitForTimeout(400);
        if ((await panel.locator('[data-testid="agui-result"]').count()) > 0) {
          observed.push(`After filling the empty fields with test values: accepted. Tool result: ${(await panel.locator('[data-testid="agui-result"] pre').innerText()).replace(/\s+/g, " ").slice(0, 400)}`);
        } else {
          problems.push(`Still rejected after filling every empty field: ${(await panel.locator('[data-testid="agui-errors"] li').allInnerTexts()).slice(0, 4).join("; ")}`);
        }
      }
      result.agui = { rendered: problems.length === 0, problems, observed };
    }
  }

  // Errors and network attempts are page-wide. Attribute what can be attributed.
  for (const e of pageErrors) result.html.problems.push(`Uncaught error: ${e}`), (result.html.rendered = false);
  const csp = consoleErrors.filter((e) => /Content Security Policy|Refused to/i.test(e));
  for (const e of csp) result.html.problems.push(`Blocked by the sandbox policy: ${e}`), (result.html.rendered = false);
  result.page = {
    consoleErrors: consoleErrors.filter((e) => !csp.includes(e)),
    externalRequests: external,
  };

  results[summary.id] = result;
  const mark = (k) => (result[k].rendered ? "ok" : "FAIL");
  console.log(`${summary.id}: text:${mark("text")} a2ui:${mark("a2ui")} html:${mark("html")} agui:${mark("agui")}` +
    (result.page.consoleErrors.length ? ` console:${result.page.consoleErrors.length}` : "") +
    (external.length ? ` external:${external.length}` : ""));
  for (const k of ["text", "a2ui", "html", "agui"]) for (const p of result[k].problems) console.log(`    ${k}: ${p}`);
  for (const e of result.page.consoleErrors) console.log(`    console: ${e}`);
  await page.close();
}

await browser.close();

const out = {
  checkedWith: `Headless Chromium ${browser.version()} via Playwright, against a production build`,
  what: [
    "Each panel painted real content (not blank).",
    "A2UI: the renderer reported no processing errors and no unresolved bindings. If the surface has buttons, one is clicked and must dispatch its event; when checks disable every button, the form is first filled with valid test values.",
    'HTML: the iframe sandbox is exactly "allow-scripts", no uncaught errors, nothing blocked by the deny-all CSP, and the page reacts to a slider, a text field, a button or a checkbox.',
    "AG-UI: JSON Forms rendered controls and Submit behaved as the schemas predict for the initial data. A form rejected as incomplete is then filled with test values and must be accepted.",
    "No request left the app origin.",
  ],
  results,
};
fs.writeFileSync(path.join(root, "fixtures", "browser-check.json"), JSON.stringify(out, null, 2) + "\n");
const failed = Object.values(results).flatMap((r) => ["text", "a2ui", "html", "agui"].filter((k) => !r[k].rendered));
console.log(`\nBrowser check written. Panels with problems: ${failed.length}`);
