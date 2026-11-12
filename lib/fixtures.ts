import index from "@/fixtures/index.json";
import type { Fixture, FixtureSummary } from "./types";

/** The app reads only /fixtures. Nothing here calls a model or an API. */
export const summaries = index.fixtures as FixtureSummary[];

export async function loadFixture(id: string): Promise<Fixture | null> {
  if (!summaries.some((s) => s.id === id)) return null;
  const mod = await import(`@/fixtures/${id}.json`);
  return mod.default as Fixture;
}

export async function loadAllFixtures(): Promise<Fixture[]> {
  const all = await Promise.all(summaries.map((s) => loadFixture(s.id)));
  return all.filter((f): f is Fixture => f !== null);
}
