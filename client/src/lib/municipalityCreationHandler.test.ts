import { describe, expect, it, vi } from "vitest";
import { applyMunicipalityCreationSuccess } from "./municipalityCreationHandler";

describe("sucesso do cadastro de prefeitura", () => {
  it("atualiza o contexto ativo e abre a revelação do token devolvido pelo cadastro", () => {
    const setMunicipalities = vi.fn();
    const selectMunicipality = vi.fn();
    const revealToken = vi.fn();
    applyMunicipalityCreationSuccess({ current: [], created: { id: "mun-nova", name: "Prefeitura Nova", state: "PR", population: 12000, integrationToken: "pm_tokenmunicipalcomseguranca123456789" }, setMunicipalities, selectMunicipality, revealToken });
    expect(setMunicipalities).toHaveBeenCalledWith([expect.objectContaining({ id: "mun-nova" })]);
    expect(selectMunicipality).toHaveBeenCalledWith("mun-nova");
    expect(revealToken).toHaveBeenCalledWith("pm_tokenmunicipalcomseguranca123456789", "Prefeitura Nova");
  });
});
