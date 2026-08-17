import {
  boolean,
  date,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const municipalities = mysqlTable("municipalities", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  population: int("population"),
  integrationTokenHash: varchar("integrationTokenHash", { length: 64 }),
  integrationTokenHint: varchar("integrationTokenHint", { length: 12 }),
  integrationTokenCreatedAt: timestamp("integrationTokenCreatedAt"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("municipality_integration_token_hash_unique").on(table.integrationTokenHash)]);

export const municipalityMemberships = mysqlTable(
  "municipality_memberships",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    municipalityId: varchar("municipalityId", { length: 64 }).notNull(),
    role: mysqlEnum("role", ["viewer", "editor", "admin"]).default("viewer").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("membership_user_municipality_unique").on(table.userId, table.municipalityId),
    index("membership_municipality_idx").on(table.municipalityId),
  ],
);

export const municipalAuthorizedUsers = mysqlTable(
  "municipal_authorized_users",
  {
    id: int("id").autoincrement().primaryKey(),
    municipalityId: varchar("municipalityId", { length: 64 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    role: mysqlEnum("role", ["viewer", "editor", "admin"]).default("viewer").notNull(),
    status: mysqlEnum("status", ["pending", "active"]).default("pending").notNull(),
    userId: int("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    activatedAt: timestamp("activatedAt"),
  },
  table => [
    uniqueIndex("authorized_user_email_unique").on(table.email),
    index("authorized_user_municipality_idx").on(table.municipalityId),
  ],
);

export const projects = mysqlTable(
  "municipal_projects",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    area: varchar("area", { length: 120 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["planejado", "em andamento", "concluído", "cancelado"])
      .default("planejado")
      .notNull(),
    progress: int("progress").default(0).notNull(),
    startDate: date("startDate", { mode: "string" }),
    targetDate: date("targetDate", { mode: "string" }),
    budget: decimal("budget", { precision: 15, scale: 2 }),
    public: boolean("public").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("projects_tenant_status_idx").on(table.tenantId, table.status)],
);

export const indicators = mysqlTable(
  "municipal_indicators",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    area: varchar("area", { length: 120 }).notNull(),
    unit: varchar("unit", { length: 40 }).notNull(),
    description: text("description"),
    public: boolean("public").default(true).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("indicators_tenant_area_idx").on(table.tenantId, table.area)],
);

export const indicatorMeasurements = mysqlTable(
  "indicator_measurements",
  {
    id: int("id").autoincrement().primaryKey(),
    indicatorId: int("indicatorId").notNull(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    value: decimal("value", { precision: 16, scale: 2 }).notNull(),
    referenceDate: date("referenceDate", { mode: "string" }).notNull(),
    source: varchar("source", { length: 160 }).notNull(),
    quality: mysqlEnum("quality", ["validated", "pending", "unknown"]).default("unknown").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("measurements_indicator_date_idx").on(table.indicatorId, table.referenceDate)],
);

export const transparencyRecords = mysqlTable(
  "transparency_records",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    type: mysqlEnum("type", ["contract", "bid", "expense", "revenue"]).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    referenceNumber: varchar("referenceNumber", { length: 80 }),
    category: varchar("category", { length: 120 }).notNull(),
    supplier: varchar("supplier", { length: 180 }),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    eventDate: date("eventDate", { mode: "string" }).notNull(),
    status: varchar("status", { length: 80 }).notNull(),
    description: text("description"),
    public: boolean("public").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("transparency_tenant_type_date_idx").on(table.tenantId, table.type, table.eventDate)],
);

export const municipalServices = mysqlTable(
  "municipal_services",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    category: varchar("category", { length: 120 }).notNull(),
    description: text("description").notNull(),
    accessInstructions: text("accessInstructions").notNull(),
    digitalUrl: varchar("digitalUrl", { length: 500 }),
    phone: varchar("phone", { length: 50 }),
    public: boolean("public").default(true).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("services_tenant_category_idx").on(table.tenantId, table.category)],
);

export const ingestionReceipts = mysqlTable(
  "ingestion_receipts",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    source: mysqlEnum("source", ["betha", "script", "manual"]).notNull(),
    resource: varchar("resource", { length: 120 }).notNull(),
    operation: mysqlEnum("operation", ["snapshot", "incremental", "manual"]).notNull(),
    status: mysqlEnum("status", ["accepted", "processing", "completed", "error", "duplicate"])
      .default("accepted")
      .notNull(),
    acceptedRecords: int("acceptedRecords").default(0).notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 180 }).notNull(),
    checksum: varchar("checksum", { length: 128 }),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("receipt_tenant_idempotency_unique").on(table.tenantId, table.idempotencyKey),
    index("receipt_tenant_received_idx").on(table.tenantId, table.receivedAt),
  ],
);

export const ingestionBatches = mysqlTable("ingestion_batches", {
  id: varchar("id", { length: 64 }).primaryKey(),
  receiptId: varchar("receiptId", { length: 64 }).notNull(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  payload: json("payload").notNull(),
  schemaVersion: varchar("schemaVersion", { length: 80 }),
  checksum: varchar("checksum", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
