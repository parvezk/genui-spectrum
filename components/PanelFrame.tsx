"use client";

import { type ReactNode, useState } from "react";

interface Props {
  label: string;
  blurb: string;
  valid: boolean;
  warnings: number;
  note: string;
  rendered: ReactNode;
  source: ReactNode;
  testId: string;
}

/** Shared chrome for the four panels: header, rendered/source toggle, widen, and the note. */
export function PanelFrame({ label, blurb, valid, warnings, note, rendered, source, testId }: Props) {
  const [view, setView] = useState<"rendered" | "source">("rendered");
  const [wide, setWide] = useState(false);

  return (
    <section
      data-testid={testId}
      data-valid={valid}
      className={`flex min-w-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white ${
        wide ? "md:col-span-2 xl:col-span-4" : ""
      }`}
    >
      <header className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
            {label}
            {valid ? (
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                valid
              </span>
            ) : (
              <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                failed validation
              </span>
            )}
            {warnings > 0 && (
              <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                {warnings} warning{warnings > 1 ? "s" : ""}
              </span>
            )}
          </h2>
          <p className="truncate text-[11px] text-zinc-500">{blurb}</p>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded border border-zinc-200 text-[11px]">
          {(["rendered", "source"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`px-2 py-1 capitalize ${
                view === v ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={wide}
          onClick={() => setWide((w) => !w)}
          title={wide ? "Back to side by side" : "Give this panel the full width"}
          className="hidden shrink-0 rounded border border-zinc-200 px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-100 md:block"
        >
          {wide ? "Narrow" : "Widen"}
        </button>
      </header>

      {/* Both views stay mounted so switching to Source does not reset form or iframe state. */}
      <div className="h-[640px] overflow-auto" hidden={view !== "rendered"}>
        {rendered}
      </div>
      <div className="h-[640px] overflow-auto bg-zinc-50 p-3" hidden={view !== "source"}>
        {source}
      </div>

      <footer className="flex-1 border-t border-zinc-200 bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-700">
        <span className="font-medium text-zinc-950">Note. </span>
        {note}
      </footer>
    </section>
  );
}
