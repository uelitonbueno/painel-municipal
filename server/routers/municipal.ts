import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

export const projectStatusSchema = z.enum(["planejado", "em andamento", "concluído", "cancelado"]);
export const membershipRoleSchema = z.enum(["viewer", "editor", "admin"]);
const transparencyTypeSchema = z.enum(["contract", "bid", "expense", "revenue"]);
const tenantInput = z.object({ tenantId: z.string().min(1) });

export const receiverEnvelopeSchema = z.object({
  tenantId: z.string().min(1),
  source: z.enum(["betha", "script"]),
  resource: z.string().min(1),
  operation: z.enum(["snapshot", "incremental"]),
  sentAt: z.string().datetime(),
  records: z.array(z.record(z.string(), z.unknown())).min(1).max(10000),
  metadata: z.object({ userAccess: z.string().optional(), cursor: z.string().optional(), schemaVersion: z.string().optional() }).optional(),
});

const platformAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito à administração municipal." });
  return next();
});

const adminProcedure = protectedProcedure;

export function hasMunicipalPermission(role: "viewer" | "editor" | "admin" | undefined, required: "editor" | "admin" = "editor") {
  if (!role || role === "viewer") return false;
  return required === "admin" ? role === "admin" : role === "editor" || role === "admin";
}

export function hasMunicipalReadAccess(role: "viewer" | "editor" | "admin" | undefined) {
  return Boolean(role);
}

async function assertTenantReadAccess(user: { id: number; role: "user" | "admin" }, tenantId: string) {
  if (user.role === "admin") return { role: "admin" as const };
  const membership = await db.getMembership(user.id, tenantId);
  if (!hasMunicipalReadAccess(membership?.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Sua conta não possui acesso a esta prefeitura." });
  return membership;
}

async function assertTenantAccess(user: { id: number; role: "user" | "admin" }, tenantId: string, required: "editor" | "admin" = "editor") {
  if (user.role === "admin") return { role: "admin" as const };
  const membership = await db.getMembership(user.id, tenantId);
  if (!hasMunicipalPermission(membership?.role, required)) throw new TRPCError({ code: "FORBIDDEN", message: "Sua conta não possui permissão de gestão nesta prefeitura." });
  return membership;
}

const municipalityForm = z.object({ name: z.string().min(3).max(180), state: z.string().length(2), population: z.coerce.number().int().positive().optional() });
const projectForm = z.object({
  tenantId: z.string().min(1), title: z.string().min(3).max(180), area: z.string().min(2).max(120), description: z.string().max(4000).optional(),
  status: projectStatusSchema, progress: z.coerce.number().int().min(0).max(100), startDate: z.string().optional(), targetDate: z.string().optional(), budget: z.coerce.number().min(0).optional(), public: z.boolean().default(true),
});
const indicatorForm = z.object({ tenantId: z.string().min(1), name: z.string().min(3).max(160), area: z.string().min(2).max(120), unit: z.string().min(1).max(40), description: z.string().max(4000).optional(), public: z.boolean().default(true), active: z.boolean().default(true) });
const measurementForm = z.object({ tenantId: z.string().min(1), indicatorId: z.coerce.number().int().positive(), value: z.coerce.number(), referenceDate: z.string().min(10), source: z.string().min(2).max(160), quality: z.enum(["validated", "pending", "unknown"]), notes: z.string().max(1000).optional() });
const transparencyForm = z.object({ tenantId: z.string().min(1), type: transparencyTypeSchema, title: z.string().min(3).max(220), referenceNumber: z.string().max(80).optional(), category: z.string().min(2).max(120), supplier: z.string().max(180).optional(), amount: z.coerce.number().min(0), eventDate: z.string().min(10), status: z.string().min(2).max(80), description: z.string().max(4000).optional(), public: z.boolean().default(true) });
const serviceForm = z.object({ tenantId: z.string().min(1), name: z.string().min(3).max(160), category: z.string().min(2).max(120), description: z.string().min(4).max(4000), accessInstructions: z.string().min(4).max(4000), digitalUrl: z.string().url().optional().or(z.literal("")), phone: z.string().max(50).optional(), public: z.boolean().default(true), active: z.boolean().default(true) });
export const receiptForm = z.object({ tenantId: z.string().min(1), source: z.enum(["betha", "script", "manual"]), resource: z.string().min(2).max(120), operation: z.enum(["snapshot", "incremental", "manual"]), idempotencyKey: z.string().min(8).max(180), records: z.array(z.record(z.string(), z.unknown())).min(1).max(10000), schemaVersion: z.string().max(80).optional() });
const membershipForm = z.object({ tenantId: z.string().min(1), email: z.string().email(), role: membershipRoleSchema });
const membershipRemovalForm = z.object({ tenantId: z.string().min(1), membershipId: z.number().int().positive() });

export const municipalRouter = router({
  public: router({
    municipalities: protectedProcedure.query(({ ctx }) => db.listMunicipalitiesForUser(ctx.user.id, ctx.user.role === "admin")),
    dashboard: protectedProcedure.input(tenantInput).query(async ({ ctx, input }) => { await assertTenantReadAccess(ctx.user, input.tenantId); return db.getPublicDashboard(input.tenantId); }),
    indicators: protectedProcedure.input(tenantInput).query(async ({ ctx, input }) => { await assertTenantReadAccess(ctx.user, input.tenantId); return db.getPublicIndicators(input.tenantId); }),
    transparency: protectedProcedure.input(tenantInput.extend({ type: transparencyTypeSchema.optional(), category: z.string().optional(), from: z.string().optional(), to: z.string().optional() })).query(async ({ ctx, input }) => { await assertTenantReadAccess(ctx.user, input.tenantId); return db.listTransparency(input); }),
    services: protectedProcedure.input(tenantInput).query(async ({ ctx, input }) => { await assertTenantReadAccess(ctx.user, input.tenantId); return db.listServices(input.tenantId); }),
  }),
  admin: router({
    overview: adminProcedure.input(tenantInput).query(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId); return db.getAdminOverview(input.tenantId); }),
    projects: adminProcedure.input(tenantInput).query(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId); return db.listProjects(input.tenantId); }),
    indicators: adminProcedure.input(tenantInput).query(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId); return db.getPublicIndicators(input.tenantId, true); }),
    transparency: adminProcedure.input(tenantInput).query(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId); return db.listTransparency({ tenantId: input.tenantId, includePrivate: true }); }),
    services: adminProcedure.input(tenantInput).query(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId); return db.listServices(input.tenantId, true); }),
    receipts: adminProcedure.input(tenantInput).query(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId, "admin"); return db.listReceipts(input.tenantId); }),
    members: adminProcedure.input(tenantInput).query(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId, "admin"); return db.listMunicipalityMembers(input.tenantId); }),
    createMunicipality: platformAdminProcedure.input(municipalityForm).mutation(async ({ ctx, input }) => { const municipality = await db.createMunicipality(input); await db.assignOwnerMembership(ctx.user.id, municipality.id); return municipality; }),
    createProject: adminProcedure.input(projectForm).mutation(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId, "admin"); await db.createProject({ ...input, budget: input.budget?.toFixed(2) ?? null, description: input.description || null, startDate: input.startDate || null, targetDate: input.targetDate || null }); }),
    updateProject: adminProcedure.input(projectForm.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId, "admin"); const { id, ...values } = input; await db.updateProject(id, input.tenantId, { ...values, budget: values.budget?.toFixed(2) ?? null, description: values.description || null, startDate: values.startDate || null, targetDate: values.targetDate || null }); }),
    createIndicator: adminProcedure.input(indicatorForm).mutation(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId, "admin"); await db.createIndicator({ ...input, description: input.description || null }); }),
    updateIndicator: adminProcedure.input(indicatorForm.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId, "admin"); const { id, ...values } = input; await db.updateIndicator(id, input.tenantId, { ...values, description: values.description || null }); }),
    createMeasurement: adminProcedure.input(measurementForm).mutation(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId, "admin"); await db.createMeasurement({ ...input, value: input.value.toFixed(2), notes: input.notes || null }); }),
    createTransparency: adminProcedure.input(transparencyForm).mutation(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId, "admin"); await db.createTransparencyRecord({ ...input, amount: input.amount.toFixed(2), referenceNumber: input.referenceNumber || null, supplier: input.supplier || null, description: input.description || null }); }),
    updateTransparency: adminProcedure.input(transparencyForm.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId, "admin"); const { id, ...values } = input; await db.updateTransparencyRecord(id, input.tenantId, { ...values, amount: values.amount.toFixed(2), referenceNumber: values.referenceNumber || null, supplier: values.supplier || null, description: values.description || null }); }),
    createService: adminProcedure.input(serviceForm).mutation(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId, "admin"); await db.createService({ ...input, description: input.description, accessInstructions: input.accessInstructions, digitalUrl: input.digitalUrl || null, phone: input.phone || null }); }),
    updateService: adminProcedure.input(serviceForm.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId, "admin"); const { id, ...values } = input; await db.updateService(id, input.tenantId, { ...values, digitalUrl: values.digitalUrl || null, phone: values.phone || null }); }),
    recordReceipt: adminProcedure.input(receiptForm).mutation(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId, "admin"); return db.recordIngestion(input); }),
    assignMember: adminProcedure.input(membershipForm).mutation(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId, "admin"); return db.assignMembershipByEmail({ municipalityId: input.tenantId, email: input.email, role: input.role }); }),
    removeMember: adminProcedure.input(membershipRemovalForm).mutation(async ({ ctx, input }) => { await assertTenantAccess(ctx.user, input.tenantId, "admin"); await db.removeMembership(input.membershipId, input.tenantId); return { success: true } as const; }),
  }),
});
