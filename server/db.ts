import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import { createHash, randomBytes } from "node:crypto";
import {
  indicatorMeasurements,
  indicators,
  ingestionBatches,
  ingestionReceipts,
  InsertUser,
  municipalAuthorizedUsers,
  municipalityMemberships,
  municipalities,
  municipalServices,
  projects,
  taxLedgerEntries,
  transparencyRecords,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  const persisted = (await db.select().from(users).where(eq(users.openId, user.openId)).limit(1))[0];
  if (persisted?.email) await activateMunicipalUserAuthorization(persisted.id, persisted.email, persisted.role === "admin");
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

const numberValue = (value: string | number | null | undefined) => Number(value ?? 0);

export function generateMunicipalIntegrationToken() {
  return `pm_${randomBytes(24).toString("base64url")}`;
}

export function hashMunicipalIntegrationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function canActivateMunicipalAuthorization(existingMunicipalityIds: string[], authorizedMunicipalityId: string, isSuperUser: boolean) {
  return isSuperUser || existingMunicipalityIds.every(municipalityId => municipalityId === authorizedMunicipalityId);
}

export function resolveAuthorizedLogin(authorization: { municipalityId: string } | undefined, existingMunicipalityIds: string[], isSuperUser: boolean) {
  if (!authorization) return { activate: false as const };
  return { activate: canActivateMunicipalAuthorization(existingMunicipalityIds, authorization.municipalityId, isSuperUser), municipalityId: authorization.municipalityId };
}

export async function executeAuthorizedLoginActivation(input: {
  authorization: { id: number; municipalityId: string; role: "viewer" | "editor" | "admin" } | undefined;
  userId: number;
  existingMunicipalityIds: string[];
  isSuperUser: boolean;
  grantMembership: (municipalityId: string, role: "viewer" | "editor" | "admin") => Promise<void>;
  markAuthorizationActive: (authorizationId: number) => Promise<void>;
}) {
  const activation = resolveAuthorizedLogin(input.authorization, input.existingMunicipalityIds, input.isSuperUser);
  if (!activation.activate || !input.authorization) return false;
  await input.grantMembership(activation.municipalityId, input.authorization.role);
  await input.markAuthorizationActive(input.authorization.id);
  return true;
}

async function resolveMunicipality(tenantId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const query = db.select().from(municipalities).where(and(eq(municipalities.id, tenantId), eq(municipalities.active, true)));
  return (await query.limit(1))[0];
}

export async function listMunicipalities() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(municipalities).where(eq(municipalities.active, true)).orderBy(municipalities.name);
}

export async function listMunicipalitiesForUser(userId: number, isSuperUser: boolean) {
  const db = await getDb();
  if (!db) return [];
  if (isSuperUser) return listMunicipalities();
  return db.select({ id: municipalities.id, name: municipalities.name, state: municipalities.state, population: municipalities.population }).from(municipalities).innerJoin(municipalityMemberships, eq(municipalityMemberships.municipalityId, municipalities.id)).where(and(eq(municipalities.active, true), eq(municipalityMemberships.userId, userId))).orderBy(municipalities.name);
}

export async function getMunicipalityByIntegrationToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const tokenHash = hashMunicipalIntegrationToken(token);
  return (await db.select().from(municipalities).where(and(eq(municipalities.integrationTokenHash, tokenHash), eq(municipalities.active, true))).limit(1))[0];
}

export async function getMunicipalityIntegrationTokenInfo(municipalityId: string) {
  const municipality = await resolveMunicipality(municipalityId);
  if (!municipality) return undefined;
  return { tokenConfigured: Boolean(municipality.integrationTokenHash), tokenHint: municipality.integrationTokenHint, createdAt: municipality.integrationTokenCreatedAt };
}

export async function getPublicDashboard(tenantId: string) {
  const db = await getDb();
  const municipality = await resolveMunicipality(tenantId);
  if (!db || !municipality) {
    return { municipality: null, stats: null, revenueSeries: [], updatedAt: null };
  }

  const [projectRows, recordRows] = await Promise.all([
    db.select().from(projects).where(and(eq(projects.tenantId, municipality.id), eq(projects.public, true))),
    db.select().from(transparencyRecords).where(and(eq(transparencyRecords.tenantId, municipality.id), eq(transparencyRecords.public, true))),
  ]);
  const activeProjects = projectRows.filter(project => project.status === "em andamento");
  const monthMap = new Map<string, { month: string; receitas: number; despesas: number }>();
  recordRows.forEach(record => {
    const month = record.eventDate.slice(0, 7);
    const item = monthMap.get(month) ?? { month, receitas: 0, despesas: 0 };
    if (record.type === "revenue") item.receitas += numberValue(record.amount);
    if (record.type === "expense") item.despesas += numberValue(record.amount);
    monthMap.set(month, item);
  });
  const revenueSeries = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  const latest = recordRows.map(row => row.updatedAt).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  return {
    municipality,
    stats: {
      population: municipality.population,
      revenues: recordRows.filter(row => row.type === "revenue").reduce((sum, row) => sum + numberValue(row.amount), 0),
      expenses: recordRows.filter(row => row.type === "expense").reduce((sum, row) => sum + numberValue(row.amount), 0),
      activeProjects: activeProjects.length,
    },
    revenueSeries,
    updatedAt: latest,
  };
}

export async function getPublicIndicators(tenantId: string, includePrivate = false) {
  const db = await getDb();
  const municipality = await resolveMunicipality(tenantId);
  if (!db || !municipality) return { municipality: null, indicators: [] };
  const rules = [eq(indicators.tenantId, municipality.id), eq(indicators.active, true)];
  if (!includePrivate) rules.push(eq(indicators.public, true));
  const indicatorRows = await db.select().from(indicators).where(and(...rules)).orderBy(indicators.area, indicators.name);
  const measurements = await db.select().from(indicatorMeasurements).where(eq(indicatorMeasurements.tenantId, municipality.id)).orderBy(desc(indicatorMeasurements.referenceDate));
  return {
    municipality,
    indicators: indicatorRows.map(indicator => ({
      ...indicator,
      latestMeasurement: measurements.find(measurement => measurement.indicatorId === indicator.id) ?? null,
      history: measurements.filter(measurement => measurement.indicatorId === indicator.id).slice(0, 12).reverse(),
    })),
  };
}

export async function listTransparency(params: {
  tenantId: string;
  includePrivate?: boolean;
  type?: "contract" | "bid" | "expense" | "revenue";
  category?: string;
  from?: string;
  to?: string;
}) {
  const db = await getDb();
  const municipality = await resolveMunicipality(params.tenantId);
  if (!db || !municipality) return { municipality: null, records: [] };
  const rules = [eq(transparencyRecords.tenantId, municipality.id)];
  if (!params.includePrivate) rules.push(eq(transparencyRecords.public, true));
  if (params.type) rules.push(eq(transparencyRecords.type, params.type));
  if (params.category) rules.push(eq(transparencyRecords.category, params.category));
  if (params.from) rules.push(gte(transparencyRecords.eventDate, params.from));
  if (params.to) rules.push(lte(transparencyRecords.eventDate, params.to));
  return {
    municipality,
    records: await db.select().from(transparencyRecords).where(and(...rules)).orderBy(desc(transparencyRecords.eventDate)).limit(100),
  };
}

export async function listServices(tenantId: string, includePrivate = false) {
  const db = await getDb();
  const municipality = await resolveMunicipality(tenantId);
  if (!db || !municipality) return { municipality: null, services: [] };
  const rules = [eq(municipalServices.tenantId, municipality.id), eq(municipalServices.active, true)];
  if (!includePrivate) rules.push(eq(municipalServices.public, true));
  return {
    municipality,
    services: await db.select().from(municipalServices).where(and(...rules)).orderBy(municipalServices.category, municipalServices.name),
  };
}

export async function getAdminOverview(tenantId: string) {
  const [dashboard, indicatorData, transparency, services] = await Promise.all([
    getPublicDashboard(tenantId),
    getPublicIndicators(tenantId, true),
    listTransparency({ tenantId, includePrivate: true }),
    listServices(tenantId, true),
  ]);
  return { ...dashboard, indicators: indicatorData.indicators, transparencyCount: transparency.records.length, servicesCount: services.services.length };
}

export async function listProjects(tenantId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.tenantId, tenantId)).orderBy(desc(projects.updatedAt));
}

export async function listReceipts(tenantId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ingestionReceipts).where(eq(ingestionReceipts.tenantId, tenantId)).orderBy(desc(ingestionReceipts.receivedAt));
}

export async function recordIngestion(input: {
  tenantId: string;
  source: "betha" | "script" | "manual";
  resource: string;
  operation: "snapshot" | "incremental" | "manual";
  idempotencyKey: string;
  records: Record<string, unknown>[];
  schemaVersion?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select().from(ingestionReceipts).where(and(eq(ingestionReceipts.tenantId, input.tenantId), eq(ingestionReceipts.idempotencyKey, input.idempotencyKey))).limit(1);
  if (existing[0]) return { receipt: existing[0], duplicate: true };

  const receiptId = `rec-${nanoid(14)}`;
  const batchId = `batch-${nanoid(14)}`;
  await db.insert(ingestionReceipts).values({
    id: receiptId,
    tenantId: input.tenantId,
    source: input.source,
    resource: input.resource,
    operation: input.operation,
    status: "accepted",
    acceptedRecords: input.records.length,
    idempotencyKey: input.idempotencyKey,
  });
  await db.insert(ingestionBatches).values({
    id: batchId,
    receiptId,
    tenantId: input.tenantId,
    payload: { records: input.records },
    schemaVersion: input.schemaVersion ?? null,
  });
  const receipt = (await db.select().from(ingestionReceipts).where(eq(ingestionReceipts.id, receiptId)).limit(1))[0];
  return { receipt, duplicate: false };
}

export type TaxLedgerRecordInput = {
  externalId: string;
  fiscalYear: number;
  referenceMonth: number;
  taxType: "IPTU" | "ISS" | "ITBI" | "TAXA" | "CONTRIBUICAO" | "MULTA" | "OUTROS";
  taxCategory?: string;
  taxpayerName?: string;
  taxpayerDocument?: string;
  taxpayerType?: "PF" | "PJ" | "NA";
  neighborhood?: string;
  propertyReference?: string;
  propertyType?: string;
  companyReference?: string;
  cnae?: string;
  status?: "lancado" | "pago" | "cancelado" | "isento" | "em_aberto" | "divida_ativa";
  assessedAmount?: number;
  collectedAmount?: number;
  cancelledAmount?: number;
  exemptAmount?: number;
  outstandingAmount?: number;
  propertyTransactionValue?: number;
  activeDebtOriginal?: number;
  activeDebtCorrection?: number;
  activeDebtInterest?: number;
  activeDebtPenalty?: number;
  activeDebtStatus?: "nao_inscrita" | "inscrita" | "ajuizada" | "parcelada" | "cancelada" | "prescrita";
  dueDate?: string;
  paidDate?: string;
  sourceUpdatedAt?: string;
};

const money = (value: number | undefined) => (value ?? 0).toFixed(2);

export async function upsertTaxLedgerEntries(tenantId: string, records: TaxLedgerRecordInput[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  for (const record of records) {
    const values = {
      id: `tax-${nanoid(14)}`,
      tenantId,
      externalId: record.externalId,
      fiscalYear: record.fiscalYear,
      referenceMonth: record.referenceMonth,
      taxType: record.taxType,
      taxCategory: record.taxCategory ?? null,
      taxpayerName: record.taxpayerName ?? null,
      taxpayerDocument: record.taxpayerDocument ?? null,
      taxpayerType: record.taxpayerType ?? "NA" as const,
      neighborhood: record.neighborhood ?? null,
      propertyReference: record.propertyReference ?? null,
      propertyType: record.propertyType ?? null,
      companyReference: record.companyReference ?? null,
      cnae: record.cnae ?? null,
      status: record.status ?? "lancado" as const,
      assessedAmount: money(record.assessedAmount),
      collectedAmount: money(record.collectedAmount),
      cancelledAmount: money(record.cancelledAmount),
      exemptAmount: money(record.exemptAmount),
      outstandingAmount: money(record.outstandingAmount),
      propertyTransactionValue: record.propertyTransactionValue === undefined ? null : money(record.propertyTransactionValue),
      activeDebtOriginal: money(record.activeDebtOriginal),
      activeDebtCorrection: money(record.activeDebtCorrection),
      activeDebtInterest: money(record.activeDebtInterest),
      activeDebtPenalty: money(record.activeDebtPenalty),
      activeDebtStatus: record.activeDebtStatus ?? "nao_inscrita" as const,
      dueDate: record.dueDate ?? null,
      paidDate: record.paidDate ?? null,
      sourceUpdatedAt: record.sourceUpdatedAt ? new Date(record.sourceUpdatedAt) : null,
      updatedAt: new Date(),
    };
    await db.insert(taxLedgerEntries).values(values).onDuplicateKeyUpdate({
      set: { ...values, id: sql`id`, createdAt: sql`createdAt` },
    });
  }
  return { processed: records.length };
}

export async function completeIngestion(receiptId: string, status: "completed" | "error" = "completed") {
  const db = await getDb();
  if (!db) return;
  await db.update(ingestionReceipts).set({ status }).where(eq(ingestionReceipts.id, receiptId));
}

export type TaxFilters = { tenantId: string; fiscalYear?: number; referenceMonth?: number; taxType?: TaxLedgerRecordInput["taxType"]; neighborhood?: string; taxpayerType?: "PF" | "PJ" | "NA"; status?: TaxLedgerRecordInput["status"] };

export function filterTaxRows<T extends Pick<typeof taxLedgerEntries.$inferSelect, "fiscalYear" | "referenceMonth" | "taxType" | "neighborhood" | "taxpayerType" | "status">>(rows: T[], filters: TaxFilters) {
  return rows.filter(row => (!filters.fiscalYear || row.fiscalYear === filters.fiscalYear) && (!filters.referenceMonth || row.referenceMonth === filters.referenceMonth) && (!filters.taxType || row.taxType === filters.taxType) && (!filters.neighborhood || row.neighborhood === filters.neighborhood) && (!filters.taxpayerType || row.taxpayerType === filters.taxpayerType) && (!filters.status || row.status === filters.status));
}

export function buildTaxAnalytics(rows: Array<typeof taxLedgerEntries.$inferSelect>) {
  const totals = { assessed: 0, collected: 0, cancelled: 0, exempt: 0, outstanding: 0, activeDebt: 0, debtOriginal: 0, debtCorrection: 0, debtInterest: 0, debtPenalty: 0, transactionValue: 0 };
  const monthly = new Map<string, { period: string; assessed: number; collected: number; outstanding: number }>();
  const byTax = new Map<string, { taxType: string; assessed: number; collected: number; outstanding: number; activeDebt: number; entries: number }>();
  const byNeighborhood = new Map<string, { neighborhood: string; assessed: number; collected: number; outstanding: number; transactionValue: number }>();
  const debtStatus = new Map<string, number>();
  const contributors = new Set<string>();
  const properties = new Set<string>();
  const companies = new Set<string>();

  for (const row of rows) {
    const assessed = numberValue(row.assessedAmount); const collected = numberValue(row.collectedAmount); const cancelled = numberValue(row.cancelledAmount); const exempt = numberValue(row.exemptAmount); const outstanding = numberValue(row.outstandingAmount); const debtOriginal = numberValue(row.activeDebtOriginal); const debtCorrection = numberValue(row.activeDebtCorrection); const debtInterest = numberValue(row.activeDebtInterest); const debtPenalty = numberValue(row.activeDebtPenalty); const activeDebt = debtOriginal + debtCorrection + debtInterest + debtPenalty; const transactionValue = numberValue(row.propertyTransactionValue);
    totals.assessed += assessed; totals.collected += collected; totals.cancelled += cancelled; totals.exempt += exempt; totals.outstanding += outstanding; totals.activeDebt += activeDebt; totals.debtOriginal += debtOriginal; totals.debtCorrection += debtCorrection; totals.debtInterest += debtInterest; totals.debtPenalty += debtPenalty; totals.transactionValue += transactionValue;
    const period = `${row.fiscalYear}-${String(row.referenceMonth).padStart(2, "0")}`;
    const month = monthly.get(period) ?? { period, assessed: 0, collected: 0, outstanding: 0 }; month.assessed += assessed; month.collected += collected; month.outstanding += outstanding; monthly.set(period, month);
    const tax = byTax.get(row.taxType) ?? { taxType: row.taxType, assessed: 0, collected: 0, outstanding: 0, activeDebt: 0, entries: 0 }; tax.assessed += assessed; tax.collected += collected; tax.outstanding += outstanding; tax.activeDebt += activeDebt; tax.entries += 1; byTax.set(row.taxType, tax);
    if (row.neighborhood) { const neighborhood = byNeighborhood.get(row.neighborhood) ?? { neighborhood: row.neighborhood, assessed: 0, collected: 0, outstanding: 0, transactionValue: 0 }; neighborhood.assessed += assessed; neighborhood.collected += collected; neighborhood.outstanding += outstanding; neighborhood.transactionValue += transactionValue; byNeighborhood.set(row.neighborhood, neighborhood); }
    debtStatus.set(row.activeDebtStatus, (debtStatus.get(row.activeDebtStatus) ?? 0) + activeDebt);
    if (row.taxpayerDocument || row.taxpayerName) contributors.add(row.taxpayerDocument ?? row.taxpayerName!);
    if (row.propertyReference) properties.add(row.propertyReference);
    if (row.companyReference) companies.add(row.companyReference);
  }

  const realizationRate = totals.assessed > 0 ? (totals.collected / totals.assessed) * 100 : 0;
  const delinquencyRate = totals.assessed > 0 ? (totals.outstanding / totals.assessed) * 100 : 0;
  return {
    totals: { ...totals, realizationRate, delinquencyRate, contributors: contributors.size, properties: properties.size, companies: companies.size, records: rows.length },
    monthly: Array.from(monthly.values()).sort((a, b) => a.period.localeCompare(b.period)),
    byTax: Array.from(byTax.values()).sort((a, b) => b.collected - a.collected),
    byNeighborhood: Array.from(byNeighborhood.values()).sort((a, b) => b.outstanding - a.outstanding),
    debtStatus: Array.from(debtStatus.entries()).map(([status, value]) => ({ status, value })).sort((a, b) => b.value - a.value),
    topDebtors: rows.filter(row => numberValue(row.outstandingAmount) > 0).map(row => ({ taxpayerName: row.taxpayerName, taxpayerDocument: row.taxpayerDocument, taxType: row.taxType, neighborhood: row.neighborhood, outstanding: numberValue(row.outstandingAmount), dueDate: row.dueDate })).sort((a, b) => b.outstanding - a.outstanding).slice(0, 10),
  };
}

export async function getTaxAnalytics(filters: TaxFilters) {
  const db = await getDb();
  const municipality = await resolveMunicipality(filters.tenantId);
  if (!db || !municipality) return { municipality: null, analytics: buildTaxAnalytics([]), availableYears: [], availableNeighborhoods: [] };
  const rules = [eq(taxLedgerEntries.tenantId, filters.tenantId)];
  if (filters.fiscalYear) rules.push(eq(taxLedgerEntries.fiscalYear, filters.fiscalYear));
  if (filters.referenceMonth) rules.push(eq(taxLedgerEntries.referenceMonth, filters.referenceMonth));
  if (filters.taxType) rules.push(eq(taxLedgerEntries.taxType, filters.taxType));
  if (filters.neighborhood) rules.push(eq(taxLedgerEntries.neighborhood, filters.neighborhood));
  if (filters.taxpayerType) rules.push(eq(taxLedgerEntries.taxpayerType, filters.taxpayerType));
  if (filters.status) rules.push(eq(taxLedgerEntries.status, filters.status));
  const rows = await db.select().from(taxLedgerEntries).where(and(...rules)).orderBy(desc(taxLedgerEntries.fiscalYear), desc(taxLedgerEntries.referenceMonth)).limit(10000);
  const allRows = await db.select({ fiscalYear: taxLedgerEntries.fiscalYear, neighborhood: taxLedgerEntries.neighborhood }).from(taxLedgerEntries).where(eq(taxLedgerEntries.tenantId, filters.tenantId)).limit(10000);
  return { municipality, analytics: buildTaxAnalytics(filterTaxRows(rows, filters)), availableYears: Array.from(new Set(allRows.map(row => row.fiscalYear))).sort((a, b) => b - a), availableNeighborhoods: Array.from(new Set(allRows.map(row => row.neighborhood).filter(Boolean) as string[])).sort() };
}

export async function getMembership(userId: number, municipalityId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(municipalityMemberships).where(and(eq(municipalityMemberships.userId, userId), eq(municipalityMemberships.municipalityId, municipalityId))).limit(1))[0];
}

export async function listMunicipalityMembers(municipalityId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: municipalityMemberships.id, role: municipalityMemberships.role, userId: users.id, name: users.name, email: users.email }).from(municipalityMemberships).innerJoin(users, eq(municipalityMemberships.userId, users.id)).where(eq(municipalityMemberships.municipalityId, municipalityId)).orderBy(users.name);
}

export async function listMunicipalAuthorizedUsers(municipalityId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: municipalAuthorizedUsers.id, email: municipalAuthorizedUsers.email, role: municipalAuthorizedUsers.role, status: municipalAuthorizedUsers.status, userId: municipalAuthorizedUsers.userId, createdAt: municipalAuthorizedUsers.createdAt, activatedAt: municipalAuthorizedUsers.activatedAt, name: users.name }).from(municipalAuthorizedUsers).leftJoin(users, eq(municipalAuthorizedUsers.userId, users.id)).where(eq(municipalAuthorizedUsers.municipalityId, municipalityId)).orderBy(municipalAuthorizedUsers.email);
}

export async function authorizeMunicipalUser(input: { municipalityId: string; email: string; role: "viewer" | "editor" | "admin" }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const email = input.email.trim().toLowerCase();
  const existingAuthorization = (await db.select().from(municipalAuthorizedUsers).where(eq(municipalAuthorizedUsers.email, email)).limit(1))[0];
  if (existingAuthorization && existingAuthorization.municipalityId !== input.municipalityId) throw new Error("Este e-mail já está autorizado para outra prefeitura.");
  const account = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (account && account.role !== "admin") {
    const memberships = await db.select().from(municipalityMemberships).where(eq(municipalityMemberships.userId, account.id));
    if (memberships.some(membership => membership.municipalityId !== input.municipalityId)) throw new Error("Este usuário já possui vínculo com outra prefeitura.");
  }
  const status = account ? "active" : "pending";
  await db.insert(municipalAuthorizedUsers).values({ municipalityId: input.municipalityId, email, role: input.role, status, userId: account?.id ?? null, activatedAt: account ? new Date() : null }).onDuplicateKeyUpdate({ set: { role: input.role, status, userId: account?.id ?? null, activatedAt: account ? new Date() : null } });
  if (account) await db.insert(municipalityMemberships).values({ userId: account.id, municipalityId: input.municipalityId, role: input.role }).onDuplicateKeyUpdate({ set: { role: input.role } });
  return { email, role: input.role, status, name: account?.name ?? null };
}

export async function activateMunicipalUserAuthorization(userId: number, email: string, isSuperUser: boolean) {
  const db = await getDb();
  if (!db) return;
  const authorization = (await db.select().from(municipalAuthorizedUsers).where(eq(municipalAuthorizedUsers.email, email.trim().toLowerCase())).limit(1))[0];
  const memberships = await db.select().from(municipalityMemberships).where(eq(municipalityMemberships.userId, userId));
  await executeAuthorizedLoginActivation({
    authorization,
    userId,
    existingMunicipalityIds: memberships.map(membership => membership.municipalityId),
    isSuperUser,
    grantMembership: async (municipalityId, role) => { await db.insert(municipalityMemberships).values({ userId, municipalityId, role }).onDuplicateKeyUpdate({ set: { role } }); },
    markAuthorizationActive: async authorizationId => { await db.update(municipalAuthorizedUsers).set({ userId, status: "active", activatedAt: new Date() }).where(eq(municipalAuthorizedUsers.id, authorizationId)); },
  });
}

export async function removeMunicipalAuthorizedUser(id: number, municipalityId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const authorization = (await db.select().from(municipalAuthorizedUsers).where(and(eq(municipalAuthorizedUsers.id, id), eq(municipalAuthorizedUsers.municipalityId, municipalityId))).limit(1))[0];
  if (!authorization) return;
  if (authorization.userId) {
    const membership = (await db.select().from(municipalityMemberships).where(and(eq(municipalityMemberships.userId, authorization.userId), eq(municipalityMemberships.municipalityId, municipalityId))).limit(1))[0];
    if (membership) await removeMembership(membership.id, municipalityId);
  }
  await db.delete(municipalAuthorizedUsers).where(eq(municipalAuthorizedUsers.id, id));
}

export async function assignMembershipByEmail(input: { municipalityId: string; email: string; role: "viewer" | "editor" | "admin" }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const user = (await db.select().from(users).where(eq(users.email, input.email)).limit(1))[0];
  if (!user) throw new Error("Nenhum usuário autenticado foi encontrado com este e-mail.");
  if (user.role !== "admin") {
    const existingMemberships = await db.select().from(municipalityMemberships).where(eq(municipalityMemberships.userId, user.id));
    if (existingMemberships.some(membership => membership.municipalityId !== input.municipalityId)) throw new Error("Usuários comuns podem ser vinculados a apenas uma prefeitura. Use um superusuário para acesso multi-prefeitura.");
  }
  await db.insert(municipalityMemberships).values({ userId: user.id, municipalityId: input.municipalityId, role: input.role }).onDuplicateKeyUpdate({ set: { role: input.role } });
  return { id: user.id, name: user.name, email: user.email, role: input.role };
}

export async function removeMembership(membershipId: number, municipalityId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const target = (await db.select().from(municipalityMemberships).where(and(eq(municipalityMemberships.id, membershipId), eq(municipalityMemberships.municipalityId, municipalityId))).limit(1))[0];
  if (!target) return;
  if (target.role === "admin") {
    const admins = await db.select().from(municipalityMemberships).where(and(eq(municipalityMemberships.municipalityId, municipalityId), eq(municipalityMemberships.role, "admin")));
    if (admins.length <= 1) throw new Error("A prefeitura deve manter ao menos um administrador vinculado.");
  }
  await db.delete(municipalityMemberships).where(and(eq(municipalityMemberships.id, membershipId), eq(municipalityMemberships.municipalityId, municipalityId)));
}

export async function createMunicipality(input: { name: string; state: string; population?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const id = `mun-${nanoid(10).toLowerCase()}`;
  const integrationToken = generateMunicipalIntegrationToken();
  await db.insert(municipalities).values({ id, name: input.name, state: input.state.toUpperCase(), population: input.population ?? null, integrationTokenHash: hashMunicipalIntegrationToken(integrationToken), integrationTokenHint: integrationToken.slice(-8), integrationTokenCreatedAt: new Date() });
  const municipality = (await db.select().from(municipalities).where(eq(municipalities.id, id)).limit(1))[0];
  return { ...municipality, integrationToken };
}

export async function regenerateMunicipalIntegrationToken(municipalityId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const integrationToken = generateMunicipalIntegrationToken();
  const createdAt = new Date();
  await db.update(municipalities).set({ integrationTokenHash: hashMunicipalIntegrationToken(integrationToken), integrationTokenHint: integrationToken.slice(-8), integrationTokenCreatedAt: createdAt, updatedAt: createdAt }).where(eq(municipalities.id, municipalityId));
  return { integrationToken, tokenHint: integrationToken.slice(-8), createdAt };
}

export async function createProject(input: typeof projects.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(projects).values(input);
}

export async function updateProject(id: number, tenantId: string, input: Partial<typeof projects.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(projects).set({ ...input, updatedAt: new Date() }).where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)));
}

export async function createIndicator(input: typeof indicators.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(indicators).values(input);
}

export async function updateIndicator(id: number, tenantId: string, input: Partial<typeof indicators.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(indicators).set({ ...input, updatedAt: new Date() }).where(and(eq(indicators.id, id), eq(indicators.tenantId, tenantId)));
}

export async function createMeasurement(input: typeof indicatorMeasurements.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(indicatorMeasurements).values(input);
}

export async function createTransparencyRecord(input: typeof transparencyRecords.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(transparencyRecords).values(input);
}

export async function updateTransparencyRecord(id: number, tenantId: string, input: Partial<typeof transparencyRecords.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(transparencyRecords).set({ ...input, updatedAt: new Date() }).where(and(eq(transparencyRecords.id, id), eq(transparencyRecords.tenantId, tenantId)));
}

export async function createService(input: typeof municipalServices.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(municipalServices).values(input);
}

export async function updateService(id: number, tenantId: string, input: Partial<typeof municipalServices.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(municipalServices).set({ ...input, updatedAt: new Date() }).where(and(eq(municipalServices.id, id), eq(municipalServices.tenantId, tenantId)));
}

export async function assignOwnerMembership(userId: number, municipalityId: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(municipalityMemberships).values({ userId, municipalityId, role: "admin" }).onDuplicateKeyUpdate({ set: { role: "admin" } });
}

export const dbStatus = sql`1`;
