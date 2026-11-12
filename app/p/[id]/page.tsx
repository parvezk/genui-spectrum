import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PanelFrame } from "@/components/PanelFrame";
import { ValidationFailure, WarningList } from "@/components/ValidationFailure";
import { A2uiPanelLazy, AgUiPanelLazy } from "@/components/panels/ClientPanels";
import { HtmlPanel } from "@/components/panels/HtmlPanel";
import { TextPanel } from "@/components/panels/TextPanel";
import { loadFixture, summaries } from "@/lib/fixtures";
import { APPROACHES, CATEGORY_LABEL, type Approach } from "@/lib/types";

export function generateStaticParams() {
  return summaries.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/p/[id]">): Promise<Metadata> {
  const { id } = await params;
  const summary = summaries.find((s) => s.id === id);
  return summary ? { title: summary.title, description: summary.prompt } : {};
}

function Source({ children }: { children: string }) {
  return <pre className="source text-zinc-800">{children}</pre>;
}

export default async function PromptPage({ params }: PageProps<"/p/[id]">) {
  const { id } = await params;
  const fixture = await loadFixture(id);
  if (!fixture) notFound();

  const at = summaries.findIndex((s) => s.id === id);
  const prev = summaries[at - 1];
  const next = summaries[at + 1];
  const { text, a2ui, html, agui } = fixture;

  const rendered: Record<Approach, React.ReactNode> = {
    text: text.validation.valid ? (
      <TextPanel markdown={text.markdown} />
    ) : (
      <ValidationFailure validation={text.validation} what="Markdown answer" />
    ),
    a2ui: a2ui.validation.valid ? (
      <>
        <WarningList validation={a2ui.validation} />
        <A2uiPanelLazy messages={a2ui.messages} />
      </>
    ) : (
      <ValidationFailure validation={a2ui.validation} what="A2UI surface" />
    ),
    html: html.validation.valid ? (
      <HtmlPanel document={html.document} title={`${fixture.title} (freeform HTML)`} />
    ) : (
      <ValidationFailure validation={html.validation} what="HTML page" />
    ),
    agui: agui.validation.valid ? (
      <AgUiPanelLazy agui={agui} />
    ) : (
      <ValidationFailure validation={agui.validation} what="AG-UI rendering" />
    ),
  };

  const source: Record<Approach, string> = {
    text: text.markdown,
    a2ui: JSON.stringify(a2ui.messages, null, 2),
    html: html.document,
    agui: JSON.stringify({ toolCall: agui.toolCall, ui: agui.ui }, null, 2),
  };

  return (
    <main className="mx-auto max-w-[1800px] px-4 py-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-950">
          Gallery
        </Link>
        <span aria-hidden>/</span>
        <span>{CATEGORY_LABEL[fixture.category]}</span>
        <span aria-hidden>/</span>
        <span className="tabular-nums">
          {fixture.index} of {summaries.length}
        </span>
        <span className="ml-auto flex gap-2">
          {prev ? (
            <Link href={`/p/${prev.id}`} className="rounded border border-zinc-200 bg-white px-2 py-1 hover:border-zinc-400">
              ← {prev.title}
            </Link>
          ) : null}
          {next ? (
            <Link href={`/p/${next.id}`} className="rounded border border-zinc-200 bg-white px-2 py-1 hover:border-zinc-400">
              {next.title} →
            </Link>
          ) : null}
        </span>
      </div>

      <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-950">{fixture.title}</h1>
      <blockquote className="mt-2 max-w-5xl rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800">
        <span className="mr-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Prompt</span>
        {fixture.prompt}
      </blockquote>

      <div key={fixture.id} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {APPROACHES.map(({ key, label, blurb }) => (
          <PanelFrame
            key={key}
            testId={`panel-${key}`}
            label={label}
            blurb={blurb}
            valid={fixture[key].validation.valid}
            warnings={fixture[key].validation.warnings.length}
            note={fixture.notes[key]}
            rendered={rendered[key]}
            source={<Source>{source[key]}</Source>}
          />
        ))}
      </div>
    </main>
  );
}
