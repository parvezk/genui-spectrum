import type { Metadata } from "next";
import Link from "next/link";
import { approachSummary, browserCheck, loadAllFixtures } from "@/lib/fixtures";
import { APPROACHES, CATEGORY_LABEL, type Approach, type Fixture, type ValidationIssue } from "@/lib/types";

export const metadata: Metadata = {
  title: "Findings",
  description: "Validation failures and per-approach notes for every prompt.",
};

interface Row {
  fixture: Fixture;
  approach: Approach;
  issue: ValidationIssue;
}

function collect(fixtures: Fixture[], kind: "errors" | "warnings"): Row[] {
  return fixtures.flatMap((fixture) =>
    APPROACHES.flatMap(({ key }) => fixture[key].validation[kind].map((issue) => ({ fixture, approach: key, issue }))),
  );
}

const label = (key: Approach) => APPROACHES.find((a) => a.key === key)?.label ?? key;

/** The raw output the model had to write for one approach, for size comparisons. */
function sourceOf(f: Fixture, key: Approach): string {
  if (key === "text") return f.text.markdown;
  if (key === "html") return f.html.document;
  if (key === "a2ui") return JSON.stringify(f.a2ui.messages);
  return JSON.stringify({ toolCall: f.agui.toolCall, ui: f.agui.ui });
}

function median(values: number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function IssueTable({ rows, tone }: { rows: Row[]; tone: "red" | "amber" }) {
  const color = tone === "red" ? "text-red-700" : "text-amber-700";
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-zinc-50 text-xs text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">Prompt</th>
            <th className="px-3 py-2 font-medium">Approach</th>
            <th className="px-3 py-2 font-medium">Code</th>
            <th className="px-3 py-2 font-medium">What the validator said</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map(({ fixture, approach, issue }, i) => (
            <tr key={i} className="align-top">
              <td className="px-3 py-2">
                <Link href={`/p/${fixture.id}`} className="text-blue-700 hover:underline">
                  {String(fixture.index).padStart(2, "0")} {fixture.title}
                </Link>
              </td>
              <td className="whitespace-nowrap px-3 py-2">{label(approach)}</td>
              <td className={`px-3 py-2 font-mono text-xs ${color}`}>{issue.code}</td>
              <td className="px-3 py-2 text-zinc-700">
                {issue.message}
                {issue.path && <div className="mt-0.5 break-all font-mono text-xs text-zinc-500">{issue.path}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function FindingsPage() {
  const fixtures = await loadAllFixtures();
  const failures = collect(fixtures, "errors");
  const warnings = collect(fixtures, "warnings");
  const checks = APPROACHES.map(({ key }) => ({ key, checks: fixtures[0]?.[key].validation.checks ?? [] }));
  const browserProblems = fixtures.flatMap((fixture) =>
    APPROACHES.flatMap(({ key }) =>
      (browserCheck.results[fixture.id]?.[key].problems ?? []).map((problem) => ({ fixture, approach: key, problem })),
    ),
  );
  const pageIssues = fixtures.flatMap((fixture) => {
    const page = browserCheck.results[fixture.id]?.page;
    return [...(page?.consoleErrors ?? []), ...(page?.externalRequests ?? []).map((u) => `External request: ${u}`)].map(
      (problem) => ({ fixture, problem }),
    );
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Findings</h1>
      <p className="mt-3 max-w-3xl text-zinc-600">
        Every rendering was validated as generated and saved with the result. Nothing that failed was repaired
        by hand: failures are listed here and shown in place of the rendering on the prompt&apos;s page.
      </p>
      {fixtures[0] && <p className="mt-2 max-w-3xl text-sm text-zinc-500">{fixtures[0].generation.method}</p>}

      {approachSummary && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-950">In short</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {APPROACHES.map(({ key, label: name }) => (
              <div key={key} className="rounded-lg border border-zinc-200 bg-white p-4" data-testid={`in-short-${key}`}>
                <p className="flex items-baseline justify-between gap-2 text-sm font-medium text-zinc-950">
                  {name}
                  <span className="text-xs font-normal tabular-nums text-zinc-500">
                    median output {median(fixtures.map((f) => sourceOf(f, key).length)).toLocaleString("en-US")} characters
                  </span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">{approachSummary?.[key]}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-950">Validation summary</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {APPROACHES.map(({ key, label: name }) => {
            const failed = fixtures.filter((f) => !f[key].validation.valid).length;
            const warned = fixtures.reduce((n, f) => n + f[key].validation.warnings.length, 0);
            return (
              <div key={key} className="rounded-lg border border-zinc-200 bg-white p-4" data-testid={`summary-${key}`}>
                <p className="text-sm font-medium text-zinc-950">{name}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950">
                  {fixtures.length - failed}
                  <span className="text-base font-normal text-zinc-400"> / {fixtures.length} valid</span>
                </p>
                <p className={`mt-1 text-xs ${failed ? "font-medium text-red-700" : "text-zinc-500"}`}>
                  {failed} failed · {warned} warning{warned === 1 ? "" : "s"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-950">
          Validation failures <span className="font-normal text-zinc-400">{failures.length}</span>
        </h2>
        {failures.length === 0 ? (
          <p className="mt-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            No rendering failed validation.
          </p>
        ) : (
          <IssueTable rows={failures} tone="red" />
        )}
      </section>

      {warnings.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-950">
            Warnings <span className="font-normal text-zinc-400">{warnings.length}</span>
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Valid output that the validator still flagged. These renderings are shown.
          </p>
          <IssueTable rows={warnings} tone="amber" />
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-950">Browser check</h2>
        <p className="mt-1 max-w-3xl text-sm text-zinc-600">
          Validation reads the output; this runs it. Every prompt page was opened in a real browser and each panel
          was exercised. {browserCheck.checkedWith}.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {APPROACHES.map(({ key, label: name }) => {
            const ok = fixtures.filter((f) => browserCheck.results[f.id]?.[key].rendered).length;
            return (
              <div key={key} className="rounded-lg border border-zinc-200 bg-white p-4" data-testid={`browser-${key}`}>
                <p className="text-sm font-medium text-zinc-950">{name}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950">
                  {ok}
                  <span className="text-base font-normal text-zinc-400"> / {fixtures.length} rendered and responded</span>
                </p>
              </div>
            );
          })}
        </div>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-zinc-600">
          {browserCheck.what.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
        {browserProblems.length + pageIssues.length === 0 ? (
          <p className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            No panel rendered blank, threw an error, was blocked by the sandbox policy or made an external request.
          </p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {browserProblems.map(({ fixture, approach, problem }, i) => (
              <li key={i} className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">
                <Link href={`/p/${fixture.id}`} className="font-medium hover:underline">
                  {String(fixture.index).padStart(2, "0")} {fixture.title}
                </Link>{" "}
                · {label(approach)}: {problem}
              </li>
            ))}
            {pageIssues.map(({ fixture, problem }, i) => (
              <li key={`page-${i}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <Link href={`/p/${fixture.id}`} className="font-medium hover:underline">
                  {String(fixture.index).padStart(2, "0")} {fixture.title}
                </Link>{" "}
                · page: {problem}
              </li>
            ))}
          </ul>
        )}
        <details className="mt-4 rounded-lg border border-zinc-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-800">
            What the browser observed, prompt by prompt
          </summary>
          <div className="divide-y divide-zinc-100 border-t border-zinc-200">
            {fixtures.map((f) => (
              <div key={f.id} className="px-4 py-3 text-xs">
                <p className="font-medium text-zinc-900">
                  {String(f.index).padStart(2, "0")} {f.title}
                </p>
                <dl className="mt-1 grid gap-x-3 gap-y-1 md:grid-cols-[6rem_1fr]">
                  {APPROACHES.map(({ key, label: name }) => (
                    <div key={key} className="contents">
                      <dt className="text-zinc-500">{name}</dt>
                      <dd className="break-words text-zinc-700">
                        {(browserCheck.results[f.id]?.[key].observed ?? []).join(" · ")}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </details>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-950">What validation checks</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {checks.map(({ key, checks: list }) => (
            <div key={key} className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-sm font-medium text-zinc-950">{label(key)}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-600">
                {list.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-950">Notes by prompt</h2>
        <p className="mt-1 text-sm text-zinc-600">
          One line per approach on what it could or couldn&apos;t express for that prompt.
        </p>
        <div className="mt-4 space-y-3">
          {fixtures.map((f) => (
            <article key={f.id} className="rounded-lg border border-zinc-200 bg-white p-4" data-testid="notes">
              <h3 className="text-sm font-semibold text-zinc-950">
                <Link href={`/p/${f.id}`} className="hover:underline">
                  <span className="mr-2 tabular-nums text-zinc-400">{String(f.index).padStart(2, "0")}</span>
                  {f.title}
                </Link>
                <span className="ml-2 text-xs font-normal text-zinc-500">{CATEGORY_LABEL[f.category]}</span>
              </h3>
              <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm md:grid-cols-[7rem_1fr]">
                {APPROACHES.map(({ key, label: name }) => (
                  <div key={key} className="contents">
                    <dt className="flex items-baseline gap-1.5 font-medium text-zinc-700">
                      <span
                        aria-hidden
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                          f[key].validation.valid ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                      {name}
                    </dt>
                    <dd className="text-zinc-700">{f.notes[key]}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
