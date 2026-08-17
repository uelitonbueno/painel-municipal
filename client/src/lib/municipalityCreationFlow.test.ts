import { describe, expect, it } from "vitest";
import { resolveMunicipalityCreation } from "./municipalityCreationFlow";

describe("fluxo de criação de prefeitura", () => {
  it("seleciona a prefeitura criada e encaminha o token ao diálogo de revelação", () => {
    const result = resolveMunicipalityCreation([], { id: "mun-nova", name: "Prefeitura Nova", state: "PR", population: 12000, integrationToken: "pm_tokenmunicipalcomseguranca123456789" });
    expect(result.activeTenantId).toBe("mun-nova");
    expect(result.tokenToReveal).toBe("pm_tokenmunicipalcomseguranca123456789");
    expect(result.municipalityName).toBe("Prefeitura Nova");
  });
});
