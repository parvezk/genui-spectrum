import browserCheckJson from "@/fixtures/browser-check.json";
import index from "@/fixtures/index.json";
import type { Approach, BrowserCheck, Fixture, FixtureSummary } from "./types";

/** The app reads only /fixtures. Nothing here calls a model or an API. */
export const summaries = index.fixtures as FixtureSummary[];

/** One paragraph per approach on how it fared across the whole set. */
export const approachSummary = index.summary as Record<Approach, string> | null;

/** What a headless browser observed in each panel (scripts/browser-check.mjs). */
export const browserCheck = browserCheckJson as unknown as BrowserCheck;

export async function loadFixture(id: string): Promise<Fixture | null> {
  if (!summaries.some((s) => s.id === id)) return null;
  const mod = await import(`@/fixtures/${id}.json`);
  return mod.default as Fixture;
}

export async function loadAllFixtures(): Promise<Fixture[]> {
  const all = await Promise.all(summaries.map((s) => loadFixture(s.id)));
  return all.filter((f): f is Fixture => f !== null);
}
