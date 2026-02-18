import fs from "node:fs";
import path from "node:path";
import yaml from "../web/node_modules/yaml/dist/index.js";

const { parse } = yaml;

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const specPath = path.join(root, "openapi.yaml");

const raw = fs.readFileSync(specPath, "utf8");
const doc = parse(raw);

if (!doc || typeof doc !== "object") {
  throw new Error("openapi.yaml must parse to an object");
}

if (!doc.openapi || !String(doc.openapi).startsWith("3.")) {
  throw new Error("openapi.yaml must declare OpenAPI 3.x");
}

if (!doc.paths || typeof doc.paths !== "object") {
  throw new Error("openapi.yaml must contain paths");
}

const required = ["/now", "/secnow", "/validate"];
for (const endpoint of required) {
  if (!doc.paths[endpoint]) {
    throw new Error(`Missing required path: ${endpoint}`);
  }
}

console.log("openapi.yaml validation passed");
