import { describe, it, expect } from "vitest";
import { firstHeaderValue } from "../../src/utils/request.js";

describe("firstHeaderValue", () => {
  it("returns the string as-is when given a single string", () => {
    expect(firstHeaderValue("application/json")).toBe("application/json");
  });

  it("returns the first element when given an array", () => {
    expect(firstHeaderValue(["first", "second"])).toBe("first");
  });

  it("returns undefined when given undefined", () => {
    expect(firstHeaderValue(undefined)).toBeUndefined();
  });

  it("returns undefined for an empty array", () => {
    expect(firstHeaderValue([])).toBeUndefined();
  });
});
