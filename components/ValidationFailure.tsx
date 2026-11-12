import type { Validation } from "@/lib/types";

/** Shown in place of a rendering that failed validation. Failures are recorded, not repaired. */
export function ValidationFailure({ validation, what }: { validation: Validation; what: string }) {
  return (
    <div className="m-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-semibold">This {what} failed validation and is not rendered.</p>
      <p className="mt-1 text-xs text-red-800">
        It is kept exactly as generated. See the Source tab for the output and the Findings page for the full
        list.
      </p>
      <ul className="mt-3 space-y-2 text-xs">
        {validation.errors.map((e, i) => (
          <li key={i} className="rounded border border-red-200 bg-white p-2">
            <span className="font-mono font-medium">{e.code}</span>
            {e.path && <span className="ml-2 font-mono text-red-700">{e.path}</span>}
            <p className="mt-1 break-words">{e.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WarningList({ validation }: { validation: Validation }) {
  if (validation.warnings.length === 0) return null;
  return (
    <ul className="m-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      {validation.warnings.map((w, i) => (
        <li key={i} className="break-words">
          <span className="font-mono font-medium">{w.code}</span> {w.message}
        </li>
      ))}
    </ul>
  );
}
