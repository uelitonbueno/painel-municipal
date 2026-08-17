import { selectCreatedMunicipality, type SelectableMunicipality } from "./municipalitySelection";

export type CreatedMunicipality = SelectableMunicipality & { integrationToken: string };

export function resolveMunicipalityCreation(current: SelectableMunicipality[] | undefined, created: CreatedMunicipality) {
  const selection = selectCreatedMunicipality(current, created);
  return { ...selection, tokenToReveal: created.integrationToken, municipalityName: created.name };
}
