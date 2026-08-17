import { describe, expect, it, vi } from "vitest";
import { handleMunicipalityCreatedInInterface } from "../client/src/pages/MunicipalityAccessSetup";

describe("fluxo da interface de cadastro de prefeitura", () => {
  it("seleciona a prefeitura criada e prepara a abertura do diálogo com o token", () => {
    const setMunicipalities = vi.fn();
    const selectMunicipality = vi.fn();
    const setToken = vi.fn();
    const setTokenMunicipalityName = vi.fn();
    handleMunicipalityCreatedInInterface({ current: [], municipality: { id: "mun-nova", name: "Prefeitura Nova", state: "PR", population: 12000, integrationToken: "pm_tokenmunicipalcomseguranca123456789" }, setMunicipalities, selectMunicipality, setToken, setTokenMunicipalityName });
    expect(selectMunicipality).toHaveBeenCalledWith("mun-nova");
    expect(setToken).toHaveBeenCalledWith("pm_tokenmunicipalcomseguranca123456789");
    expect(setTokenMunicipalityName).toHaveBeenCalledWith("Prefeitura Nova");
  });
});
