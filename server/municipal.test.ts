import { describe, expect, it } from "vitest";
import { hasMunicipalPermission, membershipRoleSchema, projectStatusSchema, receiverEnvelopeSchema, receiptForm } from "./routers/municipal";

describe("contratos municipais", () => {
  it("aceita exclusivamente os status de projeto definidos para a gestão municipal", () => {
    expect(projectStatusSchema.options).toEqual(["planejado", "em andamento", "concluído", "cancelado"]);
    expect(projectStatusSchema.safeParse("em execução").success).toBe(false);
  });

  it("valida o envelope receptor pelo token municipal sem aceitar identificação direta da prefeitura", () => {
    const result = receiverEnvelopeSchema.safeParse({
      integrationToken: "pm_tokenmunicipalcomseguranca123456789",
      source: "script",
      resource: "indicadores",
      operation: "incremental",
      sentAt: "2026-08-17T18:00:00.000Z",
      records: [{ id: "I-1", valor: 12 }],
    });
    expect(result.success).toBe(true);
    expect(receiverEnvelopeSchema.safeParse({ ...result.data, integrationToken: "curto" }).success).toBe(false);
  });

  it("exige uma chave idempotente e ao menos um registro para a carga interna", () => {
    const result = receiptForm.safeParse({
      tenantId: "prefeitura-exemplo",
      source: "manual",
      resource: "indicadores",
      operation: "manual",
      idempotencyKey: "manual-2026-0001",
      records: [{ id: "I-1", valor: 12 }],
    });
    expect(result.success).toBe(true);
    expect(receiptForm.safeParse({ ...result.data, records: [] }).success).toBe(false);
  });

  it("reconhece apenas os perfis municipais previstos para vínculos de acesso", () => {
    expect(membershipRoleSchema.options).toEqual(["viewer", "editor", "admin"]);
    expect(membershipRoleSchema.safeParse("gestor").success).toBe(false);
  });

  it("autoriza edição e administração a partir do perfil municipal, sem depender do papel global", () => {
    expect(hasMunicipalPermission("viewer")).toBe(false);
    expect(hasMunicipalPermission("editor")).toBe(true);
    expect(hasMunicipalPermission("editor", "admin")).toBe(false);
    expect(hasMunicipalPermission("admin", "admin")).toBe(true);
  });
});
