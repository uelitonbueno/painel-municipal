import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getMembership: vi.fn(),
  listProjects: vi.fn(),
  createProject: vi.fn(),
  recordIngestion: vi.fn(),
  listReceipts: vi.fn(),
  listMunicipalitiesForUser: vi.fn(),
  getPublicDashboard: vi.fn(),
  getTaxAnalytics: vi.fn(),
  authorizeMunicipalUser: vi.fn(),
  createMunicipality: vi.fn(),
  assignOwnerMembership: vi.fn(),
}));

vi.mock("./db", () => mocks);

import { municipalRouter } from "./routers/municipal";

function context(role: "user" | "admin" = "user") {
  return {
    user: {
      id: 7,
      openId: "municipal-test-user",
      name: "Teste Municipal",
      email: "teste@municipio.gov.br",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

function anonymousContext() {
  return { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;
}

describe("municipal.public security", () => {
  it("exige login antes de listar qualquer prefeitura", async () => {
    const caller = municipalRouter.createCaller(anonymousContext());
    await expect(caller.public.municipalities()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("nega consulta de uma prefeitura sem vínculo", async () => {
    mocks.getMembership.mockResolvedValue(undefined);
    const caller = municipalRouter.createCaller(context());
    await expect(caller.public.dashboard({ tenantId: "mun-de-outra-prefeitura" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.getPublicDashboard).not.toHaveBeenCalled();
  });

  it("nega o BI Tributário a uma conta sem vínculo na prefeitura", async () => {
    mocks.getMembership.mockResolvedValue(undefined);
    const caller = municipalRouter.createCaller(context());
    await expect(caller.public.taxAnalytics({ tenantId: "mun-de-outra-prefeitura" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.getTaxAnalytics).not.toHaveBeenCalled();
  });

  it("mostra somente as prefeituras vinculadas ao usuário e permite visão transversal ao superusuário", async () => {
    mocks.listMunicipalitiesForUser.mockResolvedValue([{ id: "mun-001", name: "Prefeitura A" }]);
    mocks.getPublicDashboard.mockResolvedValue({ municipality: { id: "mun-002" }, stats: null, revenueSeries: [], updatedAt: null });
    const userCaller = municipalRouter.createCaller(context());
    const superCaller = municipalRouter.createCaller(context("admin"));

    await expect(userCaller.public.municipalities()).resolves.toEqual([{ id: "mun-001", name: "Prefeitura A" }]);
    await expect(superCaller.public.dashboard({ tenantId: "mun-002" })).resolves.toMatchObject({ municipality: { id: "mun-002" } });
    expect(mocks.listMunicipalitiesForUser).toHaveBeenCalledWith(7, false);
    expect(mocks.getPublicDashboard).toHaveBeenCalledWith("mun-002");
  });
});

describe("municipal.admin authorization", () => {
  it("permite ao superusuário criar uma prefeitura e receber seu token de integração", async () => {
    const municipality = { id: "mun-nova", name: "Prefeitura Exemplo", state: "PR", population: 12000, integrationToken: "pm_tokenmunicipalcomseguranca123456789" };
    mocks.createMunicipality.mockResolvedValue(municipality);
    const caller = municipalRouter.createCaller(context("admin"));

    await expect(caller.admin.createMunicipality({ name: "Prefeitura Exemplo", state: "PR", population: 12000 })).resolves.toEqual(municipality);
    expect(mocks.assignOwnerMembership).toHaveBeenCalledWith(7, "mun-nova");
  });

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

  it("permite ao administrador pré-cadastrar o e-mail que receberá acesso no primeiro login", async () => {
    mocks.getMembership.mockResolvedValue({ role: "admin" });
    mocks.authorizeMunicipalUser.mockResolvedValue({ email: "pessoa@prefeitura.gov.br", role: "viewer", status: "pending" });
    const caller = municipalRouter.createCaller(context());

    await expect(caller.admin.authorizeUser({ tenantId: "mun-001", email: "pessoa@prefeitura.gov.br", role: "viewer" })).resolves.toMatchObject({ status: "pending" });
    expect(mocks.authorizeMunicipalUser).toHaveBeenCalledWith({ municipalityId: "mun-001", email: "pessoa@prefeitura.gov.br", role: "viewer" });
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
