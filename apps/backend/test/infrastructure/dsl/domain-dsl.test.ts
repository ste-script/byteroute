import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compileDomainDslAtStartup, getCompiledDomainDsl } from "../../../src/infrastructure/dsl/domain-dsl.js";

describe("domain dsl", () => {
  let originalCwd: string;
  let originalDslPath: string | undefined;

  beforeEach(() => {
    originalCwd = process.cwd();
    originalDslPath = process.env.DOMAIN_DSL_PATH;
    delete process.env.DOMAIN_DSL_PATH;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (originalDslPath === undefined) {
      delete process.env.DOMAIN_DSL_PATH;
    } else {
      process.env.DOMAIN_DSL_PATH = originalDslPath;
    }
    vi.restoreAllMocks();
  });

  it("compiles from default backend config file", async () => {
    process.chdir(originalCwd);

    const compiled = await compileDomainDslAtStartup();

    expect(compiled.sourcePath).toContain("config/domain.dsl.yaml");
    expect(Array.from(compiled.ingestion.connection.allowedProtocols)).toEqual(["TCP", "UDP", "ICMP", "OTHER"]);
    expect(compiled.ingestion.connection.defaultProtocol).toBe("OTHER");
    expect(compiled.ingestion.connection.defaultStatus).toBe("active");
    expect(compiled.analytics.queries.byCountry.sortBy).toBe("connections");
    expect(getCompiledDomainDsl()).toBe(compiled);
  });

  it("compiles explicit yaml and applies overrides", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dsl-test-"));
    const file = join(dir, "custom.dsl.yaml");

    await writeFile(
      file,
      [
        "ingestion:",
        "  connection:",
        "    allowedProtocols: [TCP]",
        "    defaultProtocol: UDP",
        "    defaultStatus: inactive",
        "    denySourceIps:",
        "      - ' 1.1.1.1 '",
        "      - '2.2.2.2'",
        "      - ''",
        "      - '1.1.1.1'",
        "analytics:",
        "  queries:",
        "    byCountry:",
        "      sortBy: bandwidth",
        "      order: asc",
        "      limit: 3",
        "    byAsn:",
        "      limit: 2",
      ].join("\n")
    );

    process.env.DOMAIN_DSL_PATH = file;
    const compiled = await compileDomainDslAtStartup();

    expect(compiled.sourcePath).toBe(file);
    expect(Array.from(compiled.ingestion.connection.allowedProtocols)).toEqual(["TCP"]);
    expect(compiled.ingestion.connection.defaultProtocol).toBe("UDP");
    expect(compiled.ingestion.connection.defaultStatus).toBe("inactive");
    expect(Array.from(compiled.ingestion.connection.denySourceIps)).toEqual(["1.1.1.1", "2.2.2.2"]);
    expect(compiled.analytics.queries.byCountry).toEqual({ sortBy: "bandwidth", order: "asc", limit: 3 });
    expect(compiled.analytics.queries.byAsn).toEqual({ sortBy: "connections", order: "desc", limit: 2 });
    expect(compiled.analytics.queries.byProtocol).toEqual({ sortBy: "connections", order: "desc", limit: undefined });
  });

  it("falls back to default protocols when allowedProtocols is empty", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dsl-test-"));
    const file = join(dir, "empty-protocols.dsl.yaml");

    await writeFile(
      file,
      [
        "ingestion:",
        "  connection:",
        "    allowedProtocols: []",
      ].join("\n")
    );

    process.env.DOMAIN_DSL_PATH = file;
    const compiled = await compileDomainDslAtStartup();

    expect(Array.from(compiled.ingestion.connection.allowedProtocols)).toEqual(["TCP", "UDP", "ICMP", "OTHER"]);
  });

  it("falls back to defaults and logs error when yaml is invalid by schema", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dsl-test-"));
    const file = join(dir, "invalid.dsl.yaml");

    await writeFile(
      file,
      [
        "analytics:",
        "  queries:",
        "    byCountry:",
        "      limit: 0",
      ].join("\n")
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.env.DOMAIN_DSL_PATH = file;

    const compiled = await compileDomainDslAtStartup();

    expect(errorSpy).toHaveBeenCalled();
    expect(compiled.sourcePath).toBeUndefined();
    expect(Array.from(compiled.ingestion.connection.allowedProtocols)).toEqual(["TCP", "UDP", "ICMP", "OTHER"]);
    expect(compiled.analytics.queries.byCountry).toEqual({ sortBy: "connections", order: "desc", limit: undefined });
  });

  it("uses defaults when no dsl file is found", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dsl-cwd-"));
    process.chdir(dir);
    delete process.env.DOMAIN_DSL_PATH;

    const compiled = await compileDomainDslAtStartup();

    expect(compiled.sourcePath).toBeUndefined();
    expect(compiled.ingestion.connection.defaultProtocol).toBe("OTHER");
    expect(compiled.analytics.queries.byProtocol.order).toBe("desc");
  });
});
