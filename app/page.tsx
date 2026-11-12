import Link from "next/link";
import { StatusDots } from "@/components/StatusDots";
import { summaries } from "@/lib/fixtures";
import { APPROACHES, CATEGORY_LABEL, type Category } from "@/lib/types";

const CATEGORY_ORDER: Category[] = ["answer", "comparison", "data", "input"];

const CATEGORY_BLURB: Record<Category, string> = {
  answer: "Explanations and how-tos, where text is the natural baseline.",
  comparison: "Options weighed against each other, usually wanting a table or a calculator.",
  data: "Numbers and lists that want charts, boards and sortable tables.",
  input: "Bookings, filters and forms, where the UI has to hand data back.",
};

export default function GalleryPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">One prompt, rendered four ways</h1>
      <p className="mt-3 max-w-3xl text-zinc-600">
        {summaries.length} prompts, each answered as plain text, as an A2UI surface, as a freeform HTML page and
        as an AG-UI generated form. Open a prompt to see the four side by side, or read the{" "}
        <Link href="/findings" className="text-blue-700 underline">
          findings
        </Link>{" "}
        for validation failures and what each approach could and couldn&apos;t express.
      </p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {APPROACHES.map(({ key, label, blurb }, i) => (
          <div key={key} className="rounded-lg border border-zinc-200 bg-white p-3">
            <dt className="text-sm font-medium text-zinc-950">
              <span className="mr-1.5 text-zinc-400">{i + 1}</span>
              {label}
            </dt>
            <dd className="mt-1 text-xs text-zinc-600">{blurb}</dd>
          </div>
        ))}
      </dl>

      {CATEGORY_ORDER.map((category) => {
        const items = summaries.filter((s) => s.category === category);
        if (items.length === 0) return null;
        return (
          <section key={category} className="mt-10">
            <h2 className="text-lg font-semibold text-zinc-950">
              {CATEGORY_LABEL[category]}s <span className="font-normal text-zinc-400">{items.length}</span>
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{CATEGORY_BLURB[category]}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/p/${s.id}`}
                    className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 hover:shadow-sm"
                  >
                    <span className="text-xs tabular-nums text-zinc-400">
                      {String(s.index).padStart(2, "0")}
                    </span>
                    <span className="mt-1 font-medium text-zinc-950">{s.title}</span>
                    <span className="mt-1 line-clamp-3 flex-1 text-sm text-zinc-600">{s.prompt}</span>
                    <span className="mt-3 block">
                      <StatusDots valid={s.valid} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
