"use client";

import { Component, type ReactNode, useEffect, useState } from "react";
import Markdown from "react-markdown";
// The basic catalog's Icon draws Material Icons ligatures. The font is bundled
// with the app so the surface never fetches it from a CDN.
import "@fontsource/material-icons/latin-400.css";
import { MessageProcessor, STRICT_VALIDATION } from "@a2ui/web_core/v0_9";
import type { ActionPayload, SurfaceModel } from "@a2ui/web_core/v0_9";
import { basicCatalog } from "@a2ui/web_core/v0_9/basic_catalog";
import { A2uiSurface, MarkdownComponentContext } from "@a2ui/react/v0_9";
import type { ReactCatalogComponent } from "@a2ui/react/v0_9";
import type { JsonObject } from "@/lib/types";

type Surface = SurfaceModel<ReactCatalogComponent>;

interface LoggedAction {
  name: string;
  sourceComponentId: string;
  context: Record<string, unknown>;
}

function TextMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="a2ui-md">
      {/* Plain CommonMark only: the catalog allows "simple Markdown", so no tables or other GFM. */}
      <Markdown>{markdown}</Markdown>
    </div>
  );
}

class RenderBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
  render() {
    if (this.state.error) {
      return (
        <p className="m-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Renderer threw: {this.state.error}
        </p>
      );
    }
    return this.props.children;
  }
}

/** Runs the saved messages through the same strict processor the validator used. */
function processSurface(messages: JsonObject[]) {
  const processor = new MessageProcessor([basicCatalog], undefined, {
    version: "v0.9.1",
    validationConfig: STRICT_VALIDATION,
  });
  const errors = processor.processMessagesWithErrors(messages).map((e) => JSON.stringify(e));
  const surfaces = Array.from(processor.model.surfacesMap.values()) as unknown as Surface[];
  return { errors, surfaces };
}

export default function A2uiPanel({ messages }: { messages: JsonObject[] }) {
  // This component only ever loads in the browser (see ClientPanels), and a
  // fixture's messages never change, so the surface is built once per mount.
  const [{ errors, surfaces }] = useState(() => processSurface(messages));
  const [actions, setActions] = useState<LoggedAction[]>([]);

  useEffect(() => {
    // There is no agent behind the fixtures, so actions are logged instead of sent.
    const subscriptions = surfaces.map((surface) =>
      surface.onAction.subscribe((action: ActionPayload) => {
        setActions((prev) => [
          { name: action.name, sourceComponentId: action.sourceComponentId, context: action.context },
          ...prev,
        ]);
      }),
    );
    return () => subscriptions.forEach((s) => s.unsubscribe());
  }, [surfaces]);

  return (
    <div className="a2ui-light flex min-h-full flex-col">
      <div className="flex-1 p-3">
        {errors.length > 0 && (
          <ul className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {errors.map((e, i) => (
              <li key={i} className="break-words">{e}</li>
            ))}
          </ul>
        )}
        <RenderBoundary>
          <MarkdownComponentContext.Provider value={TextMarkdown}>
            {surfaces.map((surface) => (
              <A2uiSurface key={surface.id} surface={surface} />
            ))}
          </MarkdownComponentContext.Provider>
        </RenderBoundary>
      </div>
      {actions.length > 0 && (
        <div className="border-t border-zinc-200 bg-zinc-50 p-3 text-xs" data-testid="a2ui-actions">
          <p className="mb-1 font-medium text-zinc-700">
            Action sent to the agent (logged here, no agent is connected)
          </p>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-zinc-800">
            {JSON.stringify(actions[0], null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
