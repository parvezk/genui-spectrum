export type Category = "answer" | "comparison" | "data" | "input";
export type Approach = "text" | "a2ui" | "html" | "agui";

export interface ValidationIssue {
  /** Machine-readable code, e.g. VALIDATION_FAILED or EXTERNAL_REQUEST. */
  code: string;
  /** JSON pointer or location hint, when the validator reports one. */
  path?: string;
  message: string;
}

export interface Validation {
  valid: boolean;
  /** Names of the checks that were run, in order. */
  checks: string[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export type JsonObject = Record<string, unknown>;

export interface GenerateUserInterfaceCall {
  id: string;
  name: "generateUserInterface";
  arguments: {
    description: string;
    data: JsonObject;
    /** JSON Schema of the result the UI must return on submit. */
    output: JsonObject;
  };
}

export interface Fixture {
  id: string;
  index: number;
  title: string;
  category: Category;
  prompt: string;
  generation: { generator: string; method: string };
  text: { markdown: string; validation: Validation };
  a2ui: { messages: JsonObject[]; validation: Validation };
  html: { document: string; validation: Validation };
  agui: {
    toolCall: GenerateUserInterfaceCall;
    ui: { schema: JsonObject; uiSchema: JsonObject; initialData: JsonObject };
    validation: Validation;
  };
  notes: Record<Approach, string>;
}

export interface FixtureSummary {
  id: string;
  index: number;
  title: string;
  category: Category;
  prompt: string;
  valid: Record<Approach, boolean>;
}

export const APPROACHES: { key: Approach; label: string; blurb: string }[] = [
  { key: "text", label: "Text", blurb: "Markdown via react-markdown" },
  { key: "a2ui", label: "A2UI", blurb: "v0.9.1 surface, basic catalog, @a2ui/react" },
  { key: "html", label: "Freeform HTML", blurb: "Self-contained page in a sandboxed iframe" },
  { key: "agui", label: "AG-UI", blurb: "generateUserInterface + JSON Forms" },
];

export const CATEGORY_LABEL: Record<Category, string> = {
  answer: "Answer",
  comparison: "Comparison",
  data: "Data view",
  input: "Input task",
};

export interface PanelCheck {
  /** True when the panel painted real content and behaved as expected. */
  rendered: boolean;
  problems: string[];
  observed: string[];
}

export interface BrowserCheck {
  checkedWith: string;
  what: string[];
  results: Record<
    string,
    Record<Approach, PanelCheck> & { page: { consoleErrors: string[]; externalRequests: string[] } }
  >;
}
