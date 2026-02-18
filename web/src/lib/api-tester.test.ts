import { describe, expect, it } from "vitest";

import { buildCurlPreview, fieldConfigForParameter } from "./api-tester";

describe("fieldConfigForParameter", () => {
  it("uses a select for enum parameters", () => {
    const config = fieldConfigForParameter({
      name: "format",
      in: "query",
      required: false,
      schema: {
        type: "string",
        enum: ["seconds", "iso"],
      },
    });

    expect(config.widget).toBe("select");
    expect(config.options).toEqual(["seconds", "iso"]);
  });

  it("uses a checkbox for boolean parameters", () => {
    const config = fieldConfigForParameter({
      name: "json",
      in: "query",
      required: false,
      schema: {
        type: "boolean",
      },
    });

    expect(config.widget).toBe("checkbox");
  });
});

describe("buildCurlPreview", () => {
  it("builds curl command with query and body", () => {
    const curl = buildCurlPreview({
      apiBase: "http://localhost:8080",
      operation: {
        method: "POST",
        path: "/validate",
      },
      query: { format: "iso" },
      body: "{\"hello\":\"world\"}",
    });

    expect(curl).toContain("curl -X POST");
    expect(curl).toContain('"http://localhost:8080/validate?format=iso"');
    expect(curl).toContain("-H \"content-type: application/json\"");
    expect(curl).toContain("-d '{\"hello\":\"world\"}'");
  });

  it("builds relative curl command when apiBase is empty", () => {
    const curl = buildCurlPreview({
      apiBase: "",
      operation: {
        method: "GET",
        path: "/now",
      },
      query: { format: "iso" },
      body: "",
    });

    expect(curl).toContain("curl -X GET");
    expect(curl).toContain('"/now?format=iso"');
  });
});
