export type SelectableMunicipality = { id: string; name: string; state: string; population: number | null };

export function selectCreatedMunicipality(current: SelectableMunicipality[] | undefined, created: SelectableMunicipality) {
  const municipalities = [...(current ?? []).filter(item => item.id !== created.id), created].sort((left, right) => left.name.localeCompare(right.name));
  return { municipalities, activeTenantId: created.id };
}
