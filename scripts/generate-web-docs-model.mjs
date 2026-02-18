import fs from "node:fs";
import path from "node:path";
import yaml from "../web/node_modules/yaml/dist/index.js";

const { parse } = yaml;

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const specPath = path.join(root, "openapi.yaml");
const outPath = path.join(root, "web", "src", "generated", "docs-model.json");

const raw = fs.readFileSync(specPath, "utf8");
const doc = parse(raw);

const operations = [];

const resolveRef = (node) => {
  if (!node || typeof node !== "object" || !("$ref" in node)) {
    return node;
  }

  const ref = String(node.$ref);
  if (!ref.startsWith("#/")) {
    return node;
  }

  const segments = ref.slice(2).split("/");
  let current = doc;
  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return node;
    }
    current = current[segment];
  }

  return current ?? node;
};

for (const [route, routeItem] of Object.entries(doc.paths ?? {})) {
  for (const [method, operation] of Object.entries(routeItem ?? {})) {
    if (!["get", "post", "put", "patch", "delete"].includes(method)) {
      continue;
    }

    const responses = Object.entries(operation.responses ?? {}).map(([status, responseNode]) => {
      const value = resolveRef(responseNode);
      const media = value.content ? Object.keys(value.content) : [];
      return {
        status,
        description: value.description ?? "",
        contentTypes: media,
      };
    });

    operations.push({
      operationId: operation.operationId ?? `${method}_${route}`,
      method: method.toUpperCase(),
      path: route,
      summary: operation.summary ?? "",
      description: operation.description ?? "",
      tags: operation.tags ?? [],
      parameters: (operation.parameters ?? []).map((parameterNode) => {
        const param = resolveRef(parameterNode);
        return {
        name: param.name,
        in: param.in,
        required: Boolean(param.required),
        description: param.description ?? "",
        schema: param.schema ?? null,
        };
      }),
      requestBody: operation.requestBody ?? null,
      responses,
    });
  }
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({
  info: doc.info ?? {},
  servers: doc.servers ?? [],
  operations,
}, null, 2));

console.log(`Wrote ${operations.length} operations to ${outPath}`);
