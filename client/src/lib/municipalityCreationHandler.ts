import { resolveMunicipalityCreation, type CreatedMunicipality } from "./municipalityCreationFlow";
import type { SelectableMunicipality } from "./municipalitySelection";

export function applyMunicipalityCreationSuccess(input: {
  current: SelectableMunicipality[] | undefined;
  created: CreatedMunicipality;
  setMunicipalities: (municipalities: SelectableMunicipality[]) => void;
  selectMunicipality: (tenantId: string) => void;
  revealToken: (token: string, municipalityName: string) => void;
}) {
  const result = resolveMunicipalityCreation(input.current, input.created);
  input.setMunicipalities(result.municipalities);
  input.selectMunicipality(result.activeTenantId);
  input.revealToken(result.tokenToReveal, result.municipalityName);
  return result;
}
