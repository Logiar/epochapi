export interface ParameterSchema {
  type?: string;
  enum?: string[];
  default?: string | number | boolean;
}

export interface OperationParameter {
  name: string;
  in: string;
  required: boolean;
  schema?: ParameterSchema | null;
}

export interface FieldConfig {
  widget: "text" | "select" | "checkbox";
  options: string[];
  defaultValue: string;
}

export interface CurlPreviewInput {
  apiBase: string;
  operation: {
    method: string;
    path: string;
  };
  query: Record<string, string>;
  body: string;
}

export function fieldConfigForParameter(parameter: OperationParameter): FieldConfig {
  const schema = parameter.schema ?? {};

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const firstValue = schema.default != null ? String(schema.default) : schema.enum[0];
    return {
      widget: "select",
      options: schema.enum,
      defaultValue: firstValue,
    };
  }

  if (schema.type === "boolean") {
    return {
      widget: "checkbox",
      options: [],
      defaultValue: schema.default ? "true" : "",
    };
  }

  return {
    widget: "text",
    options: [],
    defaultValue: schema.default != null ? String(schema.default) : "",
  };
}

function quoteSingle(value: string): string {
  return value.replaceAll("'", "'\\''");
}

export function buildCurlPreview(input: CurlPreviewInput): string {
  const base = input.apiBase.trim();
  const url = base.length > 0
    ? new URL(`${base}${input.operation.path}`)
    : new URL(input.operation.path, "http://example.local");
  for (const [key, value] of Object.entries(input.query)) {
    if (value.length > 0) {
      url.searchParams.set(key, value);
    }
  }

  const renderedUrl = base.length > 0
    ? url.toString()
    : `${url.pathname}${url.search}`;

  const segments = [`curl -X ${input.operation.method.toUpperCase()}`, `"${renderedUrl}"`];

  if (input.body.trim().length > 0) {
    segments.push("-H \"content-type: application/json\"");
    segments.push(`-d '${quoteSingle(input.body)}'`);
  }

  return segments.join(" ");
}
