import type { Express, Request, Response } from "express";
import { z } from "zod";
import * as db from "./db";

export const taxLedgerRecordSchema = z.object({
  externalId: z.string().min(1).max(140),
  fiscalYear: z.coerce.number().int().min(2000).max(2200),
  referenceMonth: z.coerce.number().int().min(1).max(12),
  taxType: z.enum(["IPTU", "ISS", "ITBI", "TAXA", "CONTRIBUICAO", "MULTA", "OUTROS"]),
  taxCategory: z.string().max(120).optional(),
  taxpayerName: z.string().max(180).optional(),
  taxpayerDocument: z.string().max(32).optional(),
  taxpayerType: z.enum(["PF", "PJ", "NA"]).optional(),
  neighborhood: z.string().max(120).optional(),
  propertyReference: z.string().max(100).optional(),
  propertyType: z.string().max(80).optional(),
  companyReference: z.string().max(100).optional(),
  cnae: z.string().max(20).optional(),
  status: z.enum(["lancado", "pago", "cancelado", "isento", "em_aberto", "divida_ativa"]).optional(),
  assessedAmount: z.coerce.number().min(0).optional(),
  collectedAmount: z.coerce.number().min(0).optional(),
  cancelledAmount: z.coerce.number().min(0).optional(),
  exemptAmount: z.coerce.number().min(0).optional(),
  outstandingAmount: z.coerce.number().min(0).optional(),
  propertyTransactionValue: z.coerce.number().min(0).optional(),
  activeDebtOriginal: z.coerce.number().min(0).optional(),
  activeDebtCorrection: z.coerce.number().min(0).optional(),
  activeDebtInterest: z.coerce.number().min(0).optional(),
  activeDebtPenalty: z.coerce.number().min(0).optional(),
  activeDebtStatus: z.enum(["nao_inscrita", "inscrita", "ajuizada", "parcelada", "cancelada", "prescrita"]).optional(),
  dueDate: z.string().date().optional(),
  paidDate: z.string().date().optional(),
  sourceUpdatedAt: z.string().datetime().optional(),
});

export const installmentPlanRecordSchema = z.object({
  externalId: z.string().min(1).max(140), taxpayerName: z.string().max(180).optional(), taxpayerDocument: z.string().max(32).optional(), taxpayerType: z.enum(["PF", "PJ", "NA"]).optional(), taxType: z.enum(["IPTU", "ISS", "ITBI", "TAXA", "CONTRIBUICAO", "MULTA", "OUTROS"]).optional(), fiscalYear: z.coerce.number().int().min(2000).max(2200).optional(), status: z.enum(["ativo", "quitado", "cancelado", "inadimplente"]).optional(), agreementDate: z.string().date().optional(), installmentsTotal: z.coerce.number().int().min(0).optional(), installmentsPaid: z.coerce.number().int().min(0).optional(), installmentsOverdue: z.coerce.number().int().min(0).optional(), originalAmount: z.coerce.number().min(0).optional(), negotiatedAmount: z.coerce.number().min(0).optional(), recoveredAmount: z.coerce.number().min(0).optional(), outstandingAmount: z.coerce.number().min(0).optional(), sourceUpdatedAt: z.string().datetime().optional(),
});

export const inspectionRecordSchema = z.object({
  externalId: z.string().min(1).max(140), taxpayerName: z.string().max(180).optional(), taxpayerDocument: z.string().max(32).optional(), companyReference: z.string().max(100).optional(), cnae: z.string().max(20).optional(), fiscalName: z.string().max(180).optional(), fiscalYear: z.coerce.number().int().min(2000).max(2200), referenceMonth: z.coerce.number().int().min(1).max(12).optional(), status: z.enum(["aberta", "concluida", "cancelada"]).optional(), startedAt: z.string().date().optional(), completedAt: z.string().date().optional(), notifications: z.coerce.number().int().min(0).optional(), infractionNotices: z.coerce.number().int().min(0).optional(), assessedAmount: z.coerce.number().min(0).optional(), collectedAmount: z.coerce.number().min(0).optional(), fineAmount: z.coerce.number().min(0).optional(), sourceUpdatedAt: z.string().datetime().optional(),
});

export const taxpayerRecordSchema = z.object({
  externalId: z.string().min(1).max(140), name: z.string().min(1).max(180), document: z.string().max(32).optional(), type: z.enum(["PF", "PJ", "NA"]).optional(), status: z.enum(["ativo", "inativo", "suspenso", "baixado"]).optional(), economicActivity: z.string().max(180).optional(), cnae: z.string().max(20).optional(), propertiesCount: z.coerce.number().int().min(0).optional(), companiesCount: z.coerce.number().int().min(0).optional(), sourceUpdatedAt: z.string().datetime().optional(),
});

export const ingestionEnvelopeSchema = z.object({
  integrationToken: z.string().min(20),
  source: z.enum(["betha", "script"]),
  resource: z.string().min(2).max(120),
  operation: z.enum(["snapshot", "incremental"]),
  idempotencyKey: z.string().min(8).max(180),
  sentAt: z.string().datetime(),
  records: z.array(z.record(z.string(), z.unknown())).min(1).max(10000),
  metadata: z.object({ cursor: z.string().optional(), schemaVersion: z.string().max(80).optional() }).optional(),
});

export async function processMunicipalIngestion(body: unknown, authorizationToken?: string) {
  const parsed = ingestionEnvelopeSchema.safeParse(body);
  if (!parsed.success) return { status: 400 as const, body: { error: "invalid_payload", details: parsed.error.flatten() } };
  const input = parsed.data;
  const token = authorizationToken || input.integrationToken;
  const municipality = await db.getMunicipalityByIntegrationToken(token);
  if (!municipality) return { status: 401 as const, body: { error: "invalid_integration_token" } };
  try {
    const result = await db.recordIngestion({ tenantId: municipality.id, source: input.source, resource: input.resource, operation: input.operation, idempotencyKey: input.idempotencyKey, records: input.records, schemaVersion: input.metadata?.schemaVersion });
    if (!result.duplicate) {
      if (input.resource === "tributos.lancamentos") await db.upsertTaxLedgerEntries(municipality.id, z.array(taxLedgerRecordSchema).min(1).max(10000).parse(input.records));
      if (input.resource === "tributos.parcelamentos") await db.upsertTaxInstallmentPlans(municipality.id, z.array(installmentPlanRecordSchema).min(1).max(10000).parse(input.records));
      if (input.resource === "tributos.fiscalizacoes") await db.upsertTaxInspections(municipality.id, z.array(inspectionRecordSchema).min(1).max(10000).parse(input.records));
      if (input.resource === "tributos.contribuintes") await db.upsertTaxPayers(municipality.id, z.array(taxpayerRecordSchema).min(1).max(10000).parse(input.records));
      if (result.receipt?.id) await db.completeIngestion(result.receipt.id);
    }
    const supportedResource = ["tributos.lancamentos", "tributos.parcelamentos", "tributos.fiscalizacoes", "tributos.contribuintes"].includes(input.resource);
    return { status: result.duplicate ? 200 as const : 202 as const, body: { receiptId: result.receipt?.id, municipalityId: municipality.id, duplicate: result.duplicate, processedRecords: supportedResource ? input.records.length : 0 } };
  } catch (error) {
    console.error("[IntegrationReceiver] Failed to accept ingestion", error);
    return { status: 500 as const, body: { error: "ingestion_unavailable" } };
  }
}

function getBearerToken(req: Request) {
  const authorization = req.header("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : undefined;
}

export function registerMunicipalIntegrationReceiver(app: Express) {
  app.post("/api/v1/ingest", async (req: Request, res: Response) => {
    const result = await processMunicipalIngestion(req.body, getBearerToken(req));
    res.status(result.status).json(result.body);
  });
}
