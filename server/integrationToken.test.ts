import { describe, expect, it } from "vitest";
import { generateMunicipalIntegrationToken, hashMunicipalIntegrationToken } from "./db";

describe("token de integração municipal", () => {
  it("gera tokens com prefixo identificável e valores não repetidos", () => {
    const first = generateMunicipalIntegrationToken();
    const second = generateMunicipalIntegrationToken();
    expect(first).toMatch(/^pm_[A-Za-z0-9_-]{32}$/);
    expect(second).toMatch(/^pm_[A-Za-z0-9_-]{32}$/);
    expect(first).not.toBe(second);
  });

  it("gera hash determinístico sem expor o token original", () => {
    const token = "pm_tokenmunicipalcomseguranca123456789";
    const hash = hashMunicipalIntegrationToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashMunicipalIntegrationToken(token));
    expect(hash).not.toContain(token);
  });
});
