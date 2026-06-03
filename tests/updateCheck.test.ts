import { describe, it, expect } from "bun:test";
import { latestVersion } from "../src/core/updateCheck";

describe("latestVersion", () => {
  it("returns a higher tag when one exists", () => {
    expect(latestVersion("0.3.0", ["v0.1.0", "v0.3.0", "v0.4.0"])).toBe("0.4.0");
  });

  it("ignores non-semver tags", () => {
    expect(latestVersion("0.3.0", ["nightly", "v0.3.0", "latest"])).toBe("0.3.0");
  });

  it("stays at current when nothing is newer", () => {
    expect(latestVersion("1.2.3", ["v1.0.0", "v1.2.3"])).toBe("1.2.3");
  });

  it("compares numerically, not lexically", () => {
    expect(latestVersion("0.9.0", ["v0.10.0"])).toBe("0.10.0");
  });

  it("accepts tags with or without a v prefix", () => {
    expect(latestVersion("0.3.0", ["0.4.0"])).toBe("0.4.0");
  });

  it("returns current when there are no tags", () => {
    expect(latestVersion("0.3.0", [])).toBe("0.3.0");
  });
});
