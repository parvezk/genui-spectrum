import { APPROACHES, type Approach } from "@/lib/types";

export function StatusDots({ valid }: { valid: Record<Approach, boolean> }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
      {APPROACHES.map(({ key, label }) => (
        <li key={key} className="flex items-center gap-1" title={`${label}: ${valid[key] ? "passed validation" : "failed validation"}`}>
          <span
            aria-hidden
            className={`inline-block h-2 w-2 rounded-full ${valid[key] ? "bg-emerald-500" : "bg-red-500"}`}
          />
          <span className={valid[key] ? "" : "font-medium text-red-700"}>
            {label}
            <span className="sr-only">{valid[key] ? " passed" : " failed"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
