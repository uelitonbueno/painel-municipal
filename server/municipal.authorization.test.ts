import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getMembership: vi.fn(),
  listProjects: vi.fn(),
  createProject: vi.fn(),
  recordIngestion: vi.fn(),
  listReceipts: vi.fn(),
}));

vi.mock("./db", () => mocks);

import { municipalRouter } from "./routers/municipal";

function context() {
  return {
    user: {
      id: 7,
      openId: "municipal-test-user",
      name: "Teste Municipal",
      email: "teste@municipio.gov.br",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

describe("municipal.admin authorization", () => {
  it("nega consulta administrativa a um vínculo viewer", async () => {
    mocks.getMembership.mockResolvedValue({ role: "viewer" });
    const caller = municipalRouter.createCaller(context());

    await expect(caller.admin.projects({ tenantId: "mun-001" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.listProjects).not.toHaveBeenCalled();
  });

  it("permite consulta a editor, mas não permite mutação", async () => {
    mocks.getMembership.mockResolvedValue({ role: "editor" });
    mocks.listProjects.mockResolvedValue([]);
    const caller = municipalRouter.createCaller(context());

    await expect(caller.admin.projects({ tenantId: "mun-001" })).resolves.toEqual([]);
    await expect(caller.admin.createProject({ tenantId: "mun-001", title: "Praça central", area: "Infraestrutura", status: "planejado", progress: 0, public: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createProject).not.toHaveBeenCalled();
  });

  it("permite mutação para o administrador vinculado", async () => {
    mocks.getMembership.mockResolvedValue({ role: "admin" });
    const caller = municipalRouter.createCaller(context());

    await expect(caller.admin.createProject({ tenantId: "mun-001", title: "Praça central", area: "Infraestrutura", status: "planejado", progress: 0, public: true })).resolves.toBeUndefined();
    expect(mocks.createProject).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "mun-001", title: "Praça central" }));
  });

  it("registra recebimento, retorna duplicidade e permite consultar o histórico", async () => {
    mocks.getMembership.mockResolvedValue({ role: "admin" });
    const receipt = { id: "rec-001", tenantId: "mun-001", idempotencyKey: "manual-2026-0001", status: "accepted", acceptedRecords: 1 };
    mocks.recordIngestion.mockResolvedValueOnce({ receipt, duplicate: false }).mockResolvedValueOnce({ receipt, duplicate: true });
    mocks.listReceipts.mockResolvedValue([receipt]);
    const caller = municipalRouter.createCaller(context());
    const input = { tenantId: "mun-001", source: "manual" as const, resource: "indicadores", operation: "manual" as const, idempotencyKey: "manual-2026-0001", records: [{ id: "I-1" }] };

    await expect(caller.admin.recordReceipt(input)).resolves.toMatchObject({ duplicate: false, receipt: { id: "rec-001" } });
    await expect(caller.admin.recordReceipt(input)).resolves.toMatchObject({ duplicate: true, receipt: { id: "rec-001" } });
    await expect(caller.admin.receipts({ tenantId: "mun-001" })).resolves.toEqual([receipt]);
    expect(mocks.recordIngestion).toHaveBeenCalledTimes(2);
  });
});
