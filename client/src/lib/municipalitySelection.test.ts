import { describe, expect, it } from "vitest";
import { selectCreatedMunicipality } from "./municipalitySelection";

describe("seleção automática de prefeitura", () => {
  it("inclui a prefeitura recém-criada na lista autorizada e a torna ativa", () => {
    const created = { id: "mun-nova", name: "Prefeitura Nova", state: "PR", population: 12000 };
    const result = selectCreatedMunicipality([{ id: "mun-antiga", name: "Prefeitura Antiga", state: "PR", population: null }], created);
    expect(result.activeTenantId).toBe("mun-nova");
    expect(result.municipalities).toContainEqual(created);
  });
});
