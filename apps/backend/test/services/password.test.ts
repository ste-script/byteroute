import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../../src/services/password.js";

describe("hashPassword", () => {
  it("returns a salt:hash string", async () => {
    const result = await hashPassword("mypassword");
    expect(result).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
  });

  it("produces different hashes for the same password (unique salt)", async () => {
    const h1 = await hashPassword("same");
    const h2 = await hashPassword("same");
    expect(h1).not.toBe(h2);
  });
});

describe("verifyPassword", () => {
  it("returns true for the correct password", async () => {
    const hash = await hashPassword("correct-horse");
    expect(await verifyPassword("correct-horse", hash)).toBe(true);
  });

  it("returns false for the wrong password", async () => {
    const hash = await hashPassword("correct-horse");
    expect(await verifyPassword("tr0ub4dor&3", hash)).toBe(false);
  });

  it("returns false when hash has no colon separator", async () => {
    expect(await verifyPassword("anything", "invalidhashwithoutcolon")).toBe(false);
  });

  it("returns false when salt part is empty", async () => {
    expect(await verifyPassword("anything", ":somehash")).toBe(false);
  });

  it("returns false when hash part is empty", async () => {
    expect(await verifyPassword("anything", "somesalt:")).toBe(false);
  });
});
