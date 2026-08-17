import { describe, expect, it } from "vitest";
import { canActivateMunicipalAuthorization, executeAuthorizedLoginActivation, resolveAuthorizedLogin } from "./db";

describe("ativação do usuário pré-autorizado", () => {
  it("permite ativar o vínculo no primeiro login quando o usuário não possui outra prefeitura", () => {
    expect(canActivateMunicipalAuthorization([], "mun-curitiba", false)).toBe(true);
    expect(canActivateMunicipalAuthorization(["mun-curitiba"], "mun-curitiba", false)).toBe(true);
  });

  it("impede ativação para conta comum já vinculada a outra prefeitura e preserva a exceção de superusuário", () => {
    expect(canActivateMunicipalAuthorization(["mun-londrina"], "mun-curitiba", false)).toBe(false);
    expect(canActivateMunicipalAuthorization(["mun-londrina"], "mun-curitiba", true)).toBe(true);
  });

  it("ativa somente o e-mail pré-autorizado e mantém e-mail não cadastrado sem vínculo", () => {
    expect(resolveAuthorizedLogin({ municipalityId: "mun-curitiba" }, [], false)).toEqual({ activate: true, municipalityId: "mun-curitiba" });
    expect(resolveAuthorizedLogin(undefined, [], false)).toEqual({ activate: false });
  });

  it("executa a ativação real do vínculo pré-autorizado e não concede acesso ao e-mail ausente", async () => {
    const grants: Array<[string, string]> = [];
    const activations: number[] = [];
    const active = await executeAuthorizedLoginActivation({ authorization: { id: 19, municipalityId: "mun-curitiba", role: "viewer" }, userId: 7, existingMunicipalityIds: [], isSuperUser: false, grantMembership: async (municipalityId, role) => { grants.push([municipalityId, role]); }, markAuthorizationActive: async id => { activations.push(id); } });
    const absent = await executeAuthorizedLoginActivation({ authorization: undefined, userId: 8, existingMunicipalityIds: [], isSuperUser: false, grantMembership: async () => { throw new Error("não deveria conceder"); }, markAuthorizationActive: async () => { throw new Error("não deveria ativar"); } });
    expect(active).toBe(true);
    expect(grants).toEqual([["mun-curitiba", "viewer"]]);
    expect(activations).toEqual([19]);
    expect(absent).toBe(false);
  });
});
