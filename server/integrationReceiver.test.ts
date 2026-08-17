import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMunicipalityByIntegrationToken: vi.fn(),
  recordIngestion: vi.fn(),
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
    expect(result).toEqual({ status: 202, body: { receiptId: "rec-001", municipalityId: "mun-curitiba", duplicate: false } });
    expect(mocks.recordIngestion).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "mun-curitiba", idempotencyKey: validEnvelope.idempotencyKey }));
  });
});
