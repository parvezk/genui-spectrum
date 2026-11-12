"use client";

import { useMemo, useState } from "react";
import { JsonForms } from "@jsonforms/react";
import { materialCells, materialRenderers } from "@jsonforms/material-renderers";
import { createAjv, type JsonSchema, type UISchemaElement } from "@jsonforms/core";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import type { ErrorObject } from "ajv";
import type { Fixture } from "@/lib/types";

const theme = createTheme({
  typography: {
    fontSize: 13,
    fontFamily: "inherit",
    h5: { fontSize: "1rem", fontWeight: 600 },
    h6: { fontSize: "0.9rem", fontWeight: 500 },
  },
  components: {
    MuiTextField: { defaultProps: { size: "small", variant: "outlined" } },
    MuiFormControl: { defaultProps: { size: "small", margin: "dense" } },
    MuiSelect: { defaultProps: { size: "small" } },
    MuiButton: { defaultProps: { size: "small" } },
  },
});

type Result =
  | { status: "idle" }
  | { status: "valid"; data: unknown }
  | { status: "invalid"; errors: string[] };

function describe(e: ErrorObject) {
  return `${e.instancePath || "/"} ${e.message ?? "is invalid"}`;
}

export default function AgUiPanel({ agui }: { agui: Fixture["agui"] }) {
  const { toolCall, ui } = agui;
  const ajv = useMemo(() => createAjv({ useDefaults: false }), []);
  const validateOutput = useMemo(() => {
    try {
      return ajv.compile(toolCall.arguments.output);
    } catch {
      return null;
    }
  }, [ajv, toolCall]);

  const [data, setData] = useState<unknown>(ui.initialData);
  const [formErrors, setFormErrors] = useState<ErrorObject[]>([]);
  const [result, setResult] = useState<Result>({ status: "idle" });

  const submit = () => {
    const errors = formErrors.map(describe);
    if (validateOutput && !validateOutput(data)) {
      for (const e of validateOutput.errors ?? []) {
        const line = describe(e);
        if (!errors.includes(line)) errors.push(line);
      }
    }
    setResult(errors.length ? { status: "invalid", errors } : { status: "valid", data });
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="agui flex min-h-full flex-col gap-3 p-3">
        <details className="rounded border border-zinc-200 bg-zinc-50 text-xs">
          <summary className="cursor-pointer px-3 py-2 font-medium text-zinc-700">
            Tool call: {toolCall.name}
          </summary>
          <div className="border-t border-zinc-200 px-3 py-2">
            <p className="mb-2 text-zinc-700">{toolCall.arguments.description}</p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-zinc-800">
              {JSON.stringify(
                { data: toolCall.arguments.data, output: toolCall.arguments.output },
                null,
                2,
              )}
            </pre>
          </div>
        </details>

        <JsonForms
          schema={ui.schema as JsonSchema}
          uischema={ui.uiSchema as unknown as UISchemaElement}
          data={data}
          renderers={materialRenderers}
          cells={materialCells}
          ajv={ajv}
          validationMode="ValidateAndShow"
          onChange={({ data: next, errors }) => {
            setData(next);
            setFormErrors((errors ?? []) as ErrorObject[]);
          }}
        />

        <div>
          <button
            type="button"
            onClick={submit}
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Submit
          </button>
        </div>

        {result.status === "valid" && (
          <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs" data-testid="agui-result">
            <p className="mb-1 font-medium text-emerald-900">
              Validated against the tool call&apos;s output schema. Tool result:
            </p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-emerald-950">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}
        {result.status === "invalid" && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-900" data-testid="agui-errors">
            <p className="mb-1 font-medium">Not submitted. The data does not match the schema:</p>
            <ul className="list-disc pl-4">
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}
