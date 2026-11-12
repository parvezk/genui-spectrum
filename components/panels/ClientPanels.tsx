"use client";

import dynamic from "next/dynamic";

const Loading = () => <p className="p-4 text-sm text-zinc-500">Loading renderer…</p>;

// The A2UI basic catalog renders through custom elements and JSON Forms pulls
// in MUI, so both load in the browser only.
export const A2uiPanelLazy = dynamic(() => import("./A2uiPanel"), { ssr: false, loading: Loading });
export const AgUiPanelLazy = dynamic(() => import("./AgUiPanel"), { ssr: false, loading: Loading });
