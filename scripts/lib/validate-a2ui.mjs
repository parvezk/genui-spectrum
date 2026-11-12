// Validates one A2UI surface (a list of server-to-client messages) as a
// v0.9.1 surface that uses only the basic catalog. Uses the same schemas and
// MessageProcessor that @a2ui/react renders with, so "valid" here means the
// renderer accepts it under strict rules.
import { A2uiMessageSchema, MessageProcessor, STRICT_VALIDATION } from "@a2ui/web_core/v0_9";
import { basicCatalog } from "@a2ui/web_core/v0_9/basic_catalog";
import { PayloadValidator } from "@a2ui/web_core/validation";

export const A2UI_VERSION = "v0.9.1";
export const BASIC_CATALOG_ID = basicCatalog.id;

const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

function getPointer(root, pointer) {
  if (pointer === "" || pointer === "/") return root;
  let cur = root;
  for (const raw of pointer.split("/").slice(1)) {
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (cur === null || typeof cur !== "object") return undefined;
    cur = Array.isArray(cur) ? cur[Number(key)] : cur[key];
  }
  return cur;
}

function setPointer(root, pointer, value) {
  if (pointer === "" || pointer === "/" || pointer === undefined) return value;
  const keys = pointer.split("/").slice(1);
  const out = isObject(root) || Array.isArray(root) ? root : {};
  let cur = out;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) cur[key] = value;
    else {
      if (cur[key] === null || typeof cur[key] !== "object") cur[key] = {};
      cur = cur[key];
    }
  });
  return out;
}

const join = (scope, path) => (path.startsWith("/") ? path : `${scope}/${path}`.replace(/\/+/g, "/"));

/** Every {path} binding and ${path} interpolation in a component, minus child templates. */
function collectBindings(value, out = []) {
  if (Array.isArray(value)) value.forEach((v) => collectBindings(v, out));
  else if (isObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1 && typeof value.path === "string") out.push(value.path);
    else if (typeof value.componentId === "string" && typeof value.path === "string") return out;
    else {
      if (value.call === "formatString" && typeof value.args?.value === "string") {
        for (const m of value.args.value.matchAll(/(?<!\\)\$\{([^${}()'":,\s]+)\}/g)) out.push(m[1]);
      }
      keys.forEach((k) => collectBindings(value[k], out));
    }
  }
  return out;
}

function checkBindings(components, dataModel, warnings) {
  const byId = new Map(components.map((c) => [c.id, c]));
  const seen = new Set();
  const visit = (id, scope) => {
    const comp = byId.get(id);
    if (!comp || seen.has(`${id}@${scope}`)) return;
    seen.add(`${id}@${scope}`);
    for (const path of collectBindings(comp)) {
      const abs = join(scope, path);
      if (getPointer(dataModel, abs) === undefined) {
        warnings.push({
          code: "MISSING_DATA_BINDING",
          path: abs,
          message: `Component '${id}' binds to '${path}', which is not in the data model, so it renders empty.`,
        });
      }
    }
    const refs = [];
    if (typeof comp.child === "string") refs.push([comp.child, scope]);
    if (typeof comp.trigger === "string") refs.push([comp.trigger, scope]);
    if (typeof comp.content === "string") refs.push([comp.content, scope]);
    if (Array.isArray(comp.tabs)) comp.tabs.forEach((t) => typeof t?.child === "string" && refs.push([t.child, scope]));
    if (Array.isArray(comp.children)) comp.children.forEach((c) => refs.push([c, scope]));
    else if (isObject(comp.children)) {
      const listPath = join(scope, comp.children.path);
      const list = getPointer(dataModel, listPath);
      if (!Array.isArray(list)) {
        warnings.push({
          code: "MISSING_DATA_BINDING",
          path: listPath,
          message: `Component '${id}' repeats over '${comp.children.path}', which is not a list in the data model.`,
        });
      } else if (list.length > 0) refs.push([comp.children.componentId, `${listPath}/0`]);
    }
    refs.forEach(([child, s]) => visit(child, s));
  };
  visit("root", "");
}

export function validateA2ui(messages) {
  const checks = [];
  const errors = [];
  const warnings = [];
  const fail = (code, message, path) => errors.push(path ? { code, path, message } : { code, message });
  const done = () => ({ valid: errors.length === 0, checks, errors, warnings });

  checks.push("messages are a non-empty JSON array");
  if (!Array.isArray(messages) || messages.length === 0) {
    fail("NOT_A_MESSAGE_LIST", "Expected a non-empty array of A2UI messages.");
    return done();
  }

  checks.push(`every message declares version ${A2UI_VERSION}`);
  messages.forEach((m, i) => {
    if (m?.version !== A2UI_VERSION) {
      fail("WRONG_VERSION", `Message ${i} has version ${JSON.stringify(m?.version)}, expected "${A2UI_VERSION}".`, `/${i}/version`);
    }
  });

  checks.push("every message matches the v0.9 server-to-client envelope schema");
  messages.forEach((m, i) => {
    const parsed = A2uiMessageSchema.safeParse(m);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      fail("ENVELOPE_SCHEMA", `Message ${i}: ${issue?.message ?? "does not match any message type"}.`, `/${i}/${(issue?.path ?? []).join("/")}`);
    }
  });

  checks.push("one surface, created first, on the basic catalog");
  const creates = messages.filter((m) => isObject(m?.createSurface));
  const surfaceIds = new Set(
    messages.map((m) => (m?.createSurface ?? m?.updateComponents ?? m?.updateDataModel ?? m?.deleteSurface)?.surfaceId),
  );
  if (creates.length !== 1 || !isObject(messages[0]?.createSurface)) {
    fail("SURFACE_SETUP", "Expected exactly one createSurface message, and it must come first.");
  } else if (creates[0].createSurface.catalogId !== BASIC_CATALOG_ID) {
    fail("NOT_BASIC_CATALOG", `catalogId is ${JSON.stringify(creates[0].createSurface.catalogId)}; only ${BASIC_CATALOG_ID} is allowed.`, "/0/createSurface/catalogId");
  }
  if (surfaceIds.size !== 1) fail("SURFACE_SETUP", `Messages address ${surfaceIds.size} surfaceIds; expected one.`);

  checks.push("every component matches its basic-catalog schema (strict, no unknown components or functions)");
  const components = [];
  const validator = new PayloadValidator(basicCatalog, STRICT_VALIDATION);
  messages.forEach((m, i) => {
    const list = m?.updateComponents?.components;
    if (!Array.isArray(list)) return;
    list.forEach((comp, j) => {
      if (isObject(comp)) components.push(comp);
      try {
        validator.validateComponent(comp);
      } catch (e) {
        fail("COMPONENT_SCHEMA", e instanceof Error ? e.message : String(e), `/${i}/updateComponents/components/${j}`);
      }
    });
  });
  if (components.length === 0) fail("NO_COMPONENTS", "The surface defines no components.");

  checks.push("MessageProcessor accepts the surface under STRICT_VALIDATION (root present, no dangling or orphan components)");
  let processor;
  try {
    processor = new MessageProcessor([basicCatalog], undefined, {
      version: A2UI_VERSION,
      validationConfig: STRICT_VALIDATION,
    });
    for (const e of processor.processMessagesWithErrors(messages)) {
      const err = e?.error ?? e;
      const message = String(err?.message ?? JSON.stringify(e));
      // The per-component pass above already reported schema errors with all details.
      if (!errors.some((x) => x.message === message)) fail(String(err?.code ?? "PROCESSOR_ERROR"), message, err?.path);
    }
    const surface = [...processor.model.surfacesMap.values()][0];
    if (!surface) fail("NO_SURFACE", "Processing the messages produced no surface.");
  } catch (e) {
    fail("PROCESSOR_THREW", e instanceof Error ? e.message : String(e));
  } finally {
    processor?.dispose?.();
  }

  checks.push("data bindings resolve in the data model (warning only)");
  let dataModel = {};
  for (const m of messages) {
    if (isObject(m?.updateDataModel)) dataModel = setPointer(dataModel, m.updateDataModel.path, m.updateDataModel.value);
  }
  try {
    checkBindings(components, dataModel, warnings);
  } catch (e) {
    warnings.push({ code: "BINDING_CHECK_SKIPPED", message: e instanceof Error ? e.message : String(e) });
  }

  return done();
}
