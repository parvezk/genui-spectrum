// Validates the AG-UI rendering: a generateUserInterface tool call
// {description, data, output} and the generated JSON Forms UI
// {schema, uiSchema, initialData}.
import Ajv from "ajv";
import addFormats from "ajv-formats";

const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

const LAYOUTS = new Set(["VerticalLayout", "HorizontalLayout", "Group", "Categorization", "Category"]);
const ELEMENTS = new Set([...LAYOUTS, "Control", "Label"]);
const EFFECTS = new Set(["SHOW", "HIDE", "ENABLE", "DISABLE"]);

function makeAjv() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

/** Resolve a JSON Forms scope such as "#/properties/a/properties/b" against a schema. */
function resolveScope(schema, scope) {
  if (typeof scope !== "string" || !scope.startsWith("#")) return undefined;
  if (scope === "#") return schema;
  let cur = schema;
  for (const raw of scope.slice(2).split("/")) {
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!isObject(cur) && !Array.isArray(cur)) return undefined;
    cur = cur[key];
    if (cur === undefined) return undefined;
  }
  return cur;
}

export function validateAgui(agui) {
  const checks = [];
  const errors = [];
  const warnings = [];
  const fail = (code, message, path) => errors.push(path ? { code, path, message } : { code, message });
  const done = () => ({ valid: errors.length === 0, checks, errors, warnings });

  checks.push("tool call is generateUserInterface with {description, data, output}");
  const call = agui?.toolCall;
  const args = call?.arguments;
  if (!isObject(call) || call.name !== "generateUserInterface") {
    fail("TOOL_CALL_NAME", `Expected a tool call named generateUserInterface, got ${JSON.stringify(call?.name)}.`, "/toolCall/name");
  }
  if (typeof call?.id !== "string" || !call.id) fail("TOOL_CALL_ID", "The tool call has no id.", "/toolCall/id");
  if (!isObject(args)) {
    fail("TOOL_CALL_ARGS", "The tool call has no arguments object.", "/toolCall/arguments");
    return done();
  }
  if (typeof args.description !== "string" || !args.description.trim()) fail("TOOL_CALL_ARGS", "arguments.description must be a non-empty string.", "/toolCall/arguments/description");
  if (!isObject(args.data)) fail("TOOL_CALL_ARGS", "arguments.data must be an object.", "/toolCall/arguments/data");
  if (!isObject(args.output)) fail("TOOL_CALL_ARGS", "arguments.output must be a JSON Schema object.", "/toolCall/arguments/output");
  const extra = Object.keys(args).filter((k) => !["description", "data", "output"].includes(k));
  if (extra.length) fail("TOOL_CALL_ARGS", `Unexpected argument(s): ${extra.join(", ")}.`, "/toolCall/arguments");

  checks.push("output is a compilable JSON Schema for an object");
  let validateOutput = null;
  if (isObject(args.output)) {
    try {
      validateOutput = makeAjv().compile(args.output);
      if (args.output.type !== "object") fail("OUTPUT_SCHEMA", 'output.type must be "object".', "/toolCall/arguments/output/type");
    } catch (e) {
      fail("OUTPUT_SCHEMA", e instanceof Error ? e.message : String(e), "/toolCall/arguments/output");
    }
  }

  checks.push("UI has {schema, uiSchema, initialData} and the schema compiles");
  const ui = agui?.ui;
  if (!isObject(ui) || !isObject(ui.schema) || !isObject(ui.uiSchema) || !isObject(ui.initialData)) {
    fail("UI_SHAPE", "ui must contain object-valued schema, uiSchema and initialData.", "/ui");
    return done();
  }
  let validateData = null;
  try {
    validateData = makeAjv().compile(ui.schema);
  } catch (e) {
    fail("UI_SCHEMA", e instanceof Error ? e.message : String(e), "/ui/schema");
  }

  checks.push("uiSchema uses JSON Forms elements only and every scope resolves in the schema");
  const walk = (el, path) => {
    if (!isObject(el)) return fail("UISCHEMA_ELEMENT", "UI schema element is not an object.", path);
    if (!ELEMENTS.has(el.type)) fail("UISCHEMA_ELEMENT", `Unknown UI schema element type ${JSON.stringify(el.type)}.`, `${path}/type`);
    if (el.type === "Control") {
      if (resolveScope(ui.schema, el.scope) === undefined) fail("UISCHEMA_SCOPE", `Control scope ${JSON.stringify(el.scope)} does not resolve in the schema.`, `${path}/scope`);
    }
    if (el.type === "Label" && typeof el.text !== "string") fail("UISCHEMA_ELEMENT", "Label needs a text string.", `${path}/text`);
    if (LAYOUTS.has(el.type)) {
      if (!Array.isArray(el.elements)) fail("UISCHEMA_ELEMENT", `${el.type} needs an elements array.`, `${path}/elements`);
      else {
        el.elements.forEach((child, i) => {
          if (el.type === "Categorization" && child?.type !== "Category" && child?.type !== "Categorization") {
            fail("UISCHEMA_ELEMENT", "Categorization children must be Category elements.", `${path}/elements/${i}/type`);
          }
          walk(child, `${path}/elements/${i}`);
        });
      }
    }
    if (el.rule !== undefined) {
      const rule = el.rule;
      if (!isObject(rule) || !EFFECTS.has(rule.effect) || !isObject(rule.condition)) {
        fail("UISCHEMA_RULE", "Rule needs an effect (SHOW, HIDE, ENABLE, DISABLE) and a condition.", `${path}/rule`);
      } else if (resolveScope(ui.schema, rule.condition.scope) === undefined || !isObject(rule.condition.schema)) {
        fail("UISCHEMA_RULE", `Rule condition scope ${JSON.stringify(rule.condition.scope)} does not resolve, or it has no schema.`, `${path}/rule/condition`);
      }
    }
  };
  walk(ui.uiSchema, "/ui/uiSchema");

  checks.push("initialData has no type errors against the schema (unfilled required fields are fine)");
  if (validateData && !validateData(ui.initialData)) {
    for (const e of validateData.errors ?? []) {
      if (e.keyword === "type" || e.keyword === "additionalProperties" || e.keyword === "enum" || e.keyword === "const") {
        fail("INITIAL_DATA", `initialData${e.instancePath} ${e.message}.`, `/ui/initialData${e.instancePath}`);
      }
    }
  }

  checks.push("the form can produce the output: every required output property exists in the UI schema");
  if (isObject(args.output)) {
    const uiProps = isObject(ui.schema.properties) ? ui.schema.properties : {};
    for (const key of Array.isArray(args.output.required) ? args.output.required : []) {
      if (!(key in uiProps)) fail("OUTPUT_MISMATCH", `output requires "${key}", but the UI schema has no such property.`, "/ui/schema/properties");
    }
    if (args.output.additionalProperties === false && isObject(args.output.properties)) {
      for (const key of Object.keys(uiProps)) {
        if (!(key in args.output.properties)) fail("OUTPUT_MISMATCH", `The UI schema collects "${key}", which output forbids (additionalProperties: false).`, `/ui/schema/properties/${key}`);
      }
    }
  }
  void validateOutput;

  return done();
}
