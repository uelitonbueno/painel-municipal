import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMunicipalityByIntegrationToken: vi.fn(),
  recordIngestion: vi.fn(),
  upsertTaxLedgerEntries: vi.fn(),
  upsertTaxInstallmentPlans: vi.fn(),
  upsertTaxInspections: vi.fn(),
  upsertTaxPayers: vi.fn(),
  completeIngestion: vi.fn(),
}));

vi.mock("./db", () => mocks);

import { processMunicipalIngestion } from "./integrationReceiver";

const validEnvelope = {
  integrationToken: "pm_tokenmunicipalcomseguranca123456789",
  source: "script" as const,
  resource: "indicadores",
  operation: "incremental" as const,
  idempotencyKey: "indicadores-2026-08-17-001",
  sentAt: "2026-08-17T21:00:00.000Z",
  records: [{ codigo: "POPULACAO", valor: 12000 }],
};

describe("receptor JSON municipal", () => {
  it("rejeita token inválido sem registrar a carga", async () => {
    mocks.getMunicipalityByIntegrationToken.mockResolvedValue(undefined);
    const result = await processMunicipalIngestion(validEnvelope);
    expect(result).toEqual({ status: 401, body: { error: "invalid_integration_token" } });
    expect(mocks.recordIngestion).not.toHaveBeenCalled();
  });

  it("roteia uma carga válida para a prefeitura identificada pelo token", async () => {
    mocks.getMunicipalityByIntegrationToken.mockResolvedValue({ id: "mun-curitiba" });
    mocks.recordIngestion.mockResolvedValue({ receipt: { id: "rec-001" }, duplicate: false });
    const result = await processMunicipalIngestion(validEnvelope);
    expect(result).toEqual({ status: 202, body: { receiptId: "rec-001", municipalityId: "mun-curitiba", duplicate: false, processedRecords: 0 } });
    expect(mocks.recordIngestion).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "mun-curitiba", idempotencyKey: validEnvelope.idempotencyKey }));
  });

  it("persiste o recurso tributário no livro fiscal da prefeitura identificada pelo token", async () => {
    mocks.getMunicipalityByIntegrationToken.mockResolvedValue({ id: "mun-curitiba" });
    mocks.recordIngestion.mockResolvedValue({ receipt: { id: "rec-tax" }, duplicate: false });
    mocks.upsertTaxLedgerEntries.mockResolvedValue({ processed: 1 });
    const result = await processMunicipalIngestion({ ...validEnvelope, resource: "tributos.lancamentos", records: [{ externalId: "iptu-001", fiscalYear: 2026, referenceMonth: 1, taxType: "IPTU", assessedAmount: 1000, collectedAmount: 800, outstandingAmount: 200 }] });
    expect(result).toMatchObject({ status: 202, body: { municipalityId: "mun-curitiba", processedRecords: 1 } });
    expect(mocks.upsertTaxLedgerEntries).toHaveBeenCalledWith("mun-curitiba", [expect.objectContaining({ externalId: "iptu-001", taxType: "IPTU" })]);
    expect(mocks.completeIngestion).toHaveBeenCalledWith("rec-tax");
  });

  it.each([
    ["tributos.parcelamentos", { externalId: "parc-001", status: "ativo", installmentsTotal: 12, outstandingAmount: 450 }, "upsertTaxInstallmentPlans"],
    ["tributos.fiscalizacoes", { externalId: "fisc-001", fiscalYear: 2026, status: "aberta", notifications: 1 }, "upsertTaxInspections"],
    ["tributos.contribuintes", { externalId: "cont-001", name: "Empresa Municipal", type: "PJ", status: "ativo" }, "upsertTaxPayers"],
  ])("roteia o recurso %s para a persistência municipal correta", async (resource, record, upsertMethod) => {
    mocks.getMunicipalityByIntegrationToken.mockResolvedValue({ id: "mun-curitiba" });
    mocks.recordIngestion.mockResolvedValue({ receipt: { id: "rec-phase2" }, duplicate: false });
    mocks[upsertMethod as "upsertTaxInstallmentPlans" | "upsertTaxInspections" | "upsertTaxPayers"].mockResolvedValue({ processed: 1 });
    const result = await processMunicipalIngestion({ ...validEnvelope, resource, idempotencyKey: `${resource}-2026-lote-001`, records: [record] });
    expect(result).toMatchObject({ status: 202, body: { municipalityId: "mun-curitiba", processedRecords: 1 } });
    expect(mocks[upsertMethod as "upsertTaxInstallmentPlans" | "upsertTaxInspections" | "upsertTaxPayers"]).toHaveBeenCalledWith("mun-curitiba", [expect.objectContaining({ externalId: record.externalId })]);
  });
});
