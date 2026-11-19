import { pgTable, text, timestamp, boolean, bigint, integer, uniqueIndex, index, pgEnum } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================================
// better-auth tables (organization = the CA firm / tenant)
// ============================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).notNull().defaultNow()
});
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", {
    withTimezone: true
  }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  activeOrganizationId: text("active_organization_id"),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).notNull().defaultNow()
});
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).notNull().defaultNow()
});
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", {
    withTimezone: true
  }).notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).notNull().defaultNow()
});

// organization = tenant. App-specific firm profile fields are extra columns.
export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow(),
  // --- firm profile ---
  gstin: text("gstin"),
  pan: text("pan"),
  email: text("email"),
  phone: text("phone"),
  addressLine: text("address_line"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  receiptPrefix: text("receipt_prefix").notNull().default("RCP"),
  bankDetails: text("bank_details")
});
export const member = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  // owner | admin (manager) | member (staff)
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow()
}, t => [index("member_org_idx").on(t.organizationId)]);
export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", {
    withTimezone: true
  }).notNull(),
  inviterId: text("inviter_id").notNull().references(() => user.id, {
    onDelete: "cascade"
  }),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow()
});

// ============================================================
// Application tables — every row carries organizationId (tenant)
// ============================================================

export const clientTypeEnum = pgEnum("client_type", ["individual", "firm", "company", "llp", "trust", "other"]);
export const frequencyEnum = pgEnum("frequency", ["one_time", "monthly", "quarterly", "half_yearly", "annual"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "partial", "paid", "cancelled"]);
export const paymentModeEnum = pgEnum("payment_mode", ["upi", "neft", "rtgs", "imps", "cheque", "cash", "other"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "in_progress", "completed"]);
export const serviceCategoryEnum = pgEnum("service_category", ["gst", "itr", "tds", "audit", "roc", "bookkeeping", "advisory", "other"]);
export const client = pgTable("client", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  name: text("name").notNull(),
  type: clientTypeEnum("type").notNull().default("individual"),
  pan: text("pan"),
  gstin: text("gstin"),
  email: text("email"),
  phone: text("phone"),
  addressLine: text("address_line"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  assignedToId: text("assigned_to_id").references(() => user.id, {
    onDelete: "set null"
  }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).notNull().defaultNow()
}, t => [index("client_org_idx").on(t.organizationId)]);
export const service = pgTable("service", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  name: text("name").notNull(),
  category: serviceCategoryEnum("category").notNull().default("other"),
  sacCode: text("sac_code").notNull().default("998221"),
  defaultFeePaise: bigint("default_fee_paise", {
    mode: "bigint"
  }).notNull().default(sql`0`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow()
}, t => [index("service_org_idx").on(t.organizationId)]);

// What work the firm does for a client, at what fee
export const engagement = pgTable("engagement", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  clientId: text("client_id").notNull().references(() => client.id, {
    onDelete: "cascade"
  }),
  serviceId: text("service_id").notNull().references(() => service.id, {
    onDelete: "restrict"
  }),
  feePaise: bigint("fee_paise", {
    mode: "bigint"
  }).notNull().default(sql`0`),
  frequency: frequencyEnum("frequency").notNull().default("one_time"),
  startDate: timestamp("start_date", {
    withTimezone: true
  }).notNull().defaultNow(),
  endDate: timestamp("end_date", {
    withTimezone: true
  }),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow()
}, t => [index("engagement_org_idx").on(t.organizationId), index("engagement_client_idx").on(t.clientId)]);
export const invoice = pgTable("invoice", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  clientId: text("client_id").notNull().references(() => client.id, {
    onDelete: "restrict"
  }),
  invoiceNo: text("invoice_no").notNull(),
  fy: text("fy").notNull(),
  // e.g. "2026-27"
  invoiceDate: timestamp("invoice_date", {
    withTimezone: true
  }).notNull(),
  dueDate: timestamp("due_date", {
    withTimezone: true
  }).notNull(),
  subtotalPaise: bigint("subtotal_paise", {
    mode: "bigint"
  }).notNull(),
  cgstPaise: bigint("cgst_paise", {
    mode: "bigint"
  }).notNull().default(sql`0`),
  sgstPaise: bigint("sgst_paise", {
    mode: "bigint"
  }).notNull().default(sql`0`),
  igstPaise: bigint("igst_paise", {
    mode: "bigint"
  }).notNull().default(sql`0`),
  totalPaise: bigint("total_paise", {
    mode: "bigint"
  }).notNull(),
  status: invoiceStatusEnum("status").notNull().default("sent"),
  placeOfSupply: text("place_of_supply"),
  notes: text("notes"),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).notNull().defaultNow()
}, t => [uniqueIndex("invoice_org_no_uniq").on(t.organizationId, t.invoiceNo), index("invoice_org_status_idx").on(t.organizationId, t.status), index("invoice_client_idx").on(t.clientId)]);
export const invoiceItem = pgTable("invoice_item", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => invoice.id, {
    onDelete: "cascade"
  }),
  description: text("description").notNull(),
  sacCode: text("sac_code"),
  quantity: integer("quantity").notNull().default(1),
  ratePaise: bigint("rate_paise", {
    mode: "bigint"
  }).notNull(),
  amountPaise: bigint("amount_paise", {
    mode: "bigint"
  }).notNull()
}, t => [index("invoice_item_invoice_idx").on(t.invoiceId)]);

// amountReceivedPaise hits the bank; tdsDeductedPaise is withheld by client (194J).
// Credit against the invoice = amountReceived + tdsDeducted.
export const payment = pgTable("payment", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  clientId: text("client_id").notNull().references(() => client.id, {
    onDelete: "restrict"
  }),
  invoiceId: text("invoice_id").references(() => invoice.id, {
    onDelete: "set null"
  }),
  receiptNo: text("receipt_no"),
  paymentDate: timestamp("payment_date", {
    withTimezone: true
  }).notNull(),
  amountReceivedPaise: bigint("amount_received_paise", {
    mode: "bigint"
  }).notNull(),
  tdsDeductedPaise: bigint("tds_deducted_paise", {
    mode: "bigint"
  }).notNull().default(sql`0`),
  tdsSection: text("tds_section").default("194J"),
  mode: paymentModeEnum("mode").notNull().default("upi"),
  referenceNo: text("reference_no"),
  notes: text("notes"),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  }).notNull().defaultNow()
}, t => [index("payment_org_idx").on(t.organizationId), index("payment_client_idx").on(t.clientId), index("payment_invoice_idx").on(t.invoiceId)]);
export const complianceTask = pgTable("compliance_task", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  clientId: text("client_id").notNull().references(() => client.id, {
    onDelete: "cascade"
  }),
  engagementId: text("engagement_id").references(() => engagement.id, {
    onDelete: "set null"
  }),
  title: text("title").notNull(),
  dueDate: timestamp("due_date", {
    withTimezone: true
  }).notNull(),
  period: text("period"),
  // e.g. "Oct 2026", "Q2 FY26-27", "FY2025-26"
  status: taskStatusEnum("status").notNull().default("pending"),
  assignedToId: text("assigned_to_id").references(() => user.id, {
    onDelete: "set null"
  }),
  completedAt: timestamp("completed_at", {
    withTimezone: true
  }),
  notes: text("notes"),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow()
}, t => [index("task_org_status_idx").on(t.organizationId, t.status), index("task_client_idx").on(t.clientId), index("task_due_idx").on(t.organizationId, t.dueDate)]);

// Gapless numbering per tenant per FY: (invoice|receipt, fy) → last value
export const tenantCounter = pgTable("tenant_counter", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  kind: text("kind").notNull(),
  fy: text("fy").notNull(),
  value: integer("value").notNull().default(0)
}, t => [uniqueIndex("counter_org_kind_fy_uniq").on(t.organizationId, t.kind, t.fy)]);
export const activityLog = pgTable("activity_log", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, {
    onDelete: "cascade"
  }),
  userId: text("user_id").references(() => user.id, {
    onDelete: "set null"
  }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  meta: text("meta"),
  createdAt: timestamp("created_at", {
    withTimezone: true
  }).notNull().defaultNow()
}, t => [index("activity_org_idx").on(t.organizationId)]);

// ============================================================
// Relations
// ============================================================

export const clientRelations = relations(client, ({
  many,
  one
}) => ({
  engagements: many(engagement),
  invoices: many(invoice),
  payments: many(payment),
  tasks: many(complianceTask),
  assignedTo: one(user, {
    fields: [client.assignedToId],
    references: [user.id]
  })
}));
export const serviceRelations = relations(service, ({
  many
}) => ({
  engagements: many(engagement)
}));
export const engagementRelations = relations(engagement, ({
  one,
  many
}) => ({
  client: one(client, {
    fields: [engagement.clientId],
    references: [client.id]
  }),
  service: one(service, {
    fields: [engagement.serviceId],
    references: [service.id]
  }),
  tasks: many(complianceTask)
}));
export const invoiceRelations = relations(invoice, ({
  one,
  many
}) => ({
  client: one(client, {
    fields: [invoice.clientId],
    references: [client.id]
  }),
  items: many(invoiceItem),
  payments: many(payment)
}));
export const invoiceItemRelations = relations(invoiceItem, ({
  one
}) => ({
  invoice: one(invoice, {
    fields: [invoiceItem.invoiceId],
    references: [invoice.id]
  })
}));
export const paymentRelations = relations(payment, ({
  one
}) => ({
  client: one(client, {
    fields: [payment.clientId],
    references: [client.id]
  }),
  invoice: one(invoice, {
    fields: [payment.invoiceId],
    references: [invoice.id]
  })
}));
export const complianceTaskRelations = relations(complianceTask, ({
  one
}) => ({
  client: one(client, {
    fields: [complianceTask.clientId],
    references: [client.id]
  }),
  engagement: one(engagement, {
    fields: [complianceTask.engagementId],
    references: [engagement.id]
  }),
  assignedTo: one(user, {
    fields: [complianceTask.assignedToId],
    references: [user.id]
  })
}));
