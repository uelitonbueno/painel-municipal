import type { Express, Request, Response } from "express";
import { z } from "zod";
import * as db from "./db";

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
    return { status: result.duplicate ? 200 as const : 202 as const, body: { receiptId: result.receipt?.id, municipalityId: municipality.id, duplicate: result.duplicate } };
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
