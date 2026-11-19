import { and, eq, sql } from "drizzle-orm";
import { generateRandomString, hashPassword } from "better-auth/crypto";
import { db, schema } from "./db";
const id = () => generateRandomString(32);
const paise = rupees => BigInt(Math.round(rupees * 100));
const ADMIN_USERNAME = "admin";
const ADMIN_EMAIL = "admin@finister.local";
const ADMIN_PASSWORD = "admin";
const ADMIN_ORG_SLUG = "admin-firm";

/**
 * Dev-only default login: admin / admin (owner of "Admin Firm").
 * Called from instrumentation.ts after migrations when DATABASE_URL
 * is unset (embedded PGlite). Sign-in only enforces max password
 * length, so the short password verifies fine while sign-up still
 * requires 8+ chars for real users.
 */
export async function seedDefaultAdmin() {
  const existing = await db.query.user.findFirst({
    where: eq(schema.user.username, ADMIN_USERNAME)
  });
  if (existing) return;
  const now = new Date();
  const userId = generateRandomString(32);
  const org = (await db.query.organization.findFirst({
    where: eq(schema.organization.slug, ADMIN_ORG_SLUG)
  })) ?? (await db.insert(schema.organization).values({
    id: generateRandomString(32),
    name: "Admin Firm",
    slug: ADMIN_ORG_SLUG,
    createdAt: now
  }).returning().then(r => r[0]));
  if (!org) throw new Error("[seed] failed to create admin organization");
  await db.insert(schema.user).values({
    id: userId,
    name: "Admin",
    email: ADMIN_EMAIL,
    emailVerified: true,
    username: ADMIN_USERNAME,
    displayUsername: ADMIN_USERNAME,
    createdAt: now,
    updatedAt: now
  });
  await db.insert(schema.account).values({
    id: generateRandomString(32),
    accountId: userId,
    providerId: "credential",
    userId,
    password: await hashPassword(ADMIN_PASSWORD),
    createdAt: now,
    updatedAt: now
  });
  await db.insert(schema.member).values({
    id: generateRandomString(32),
    organizationId: org.id,
    userId,
    role: "owner",
    createdAt: now
  });
  console.log("[seed] created default admin user (admin / admin)");
}

/**
 * Dev-only demo dataset so the embedded PGlite dashboard isn't empty.
 * Skips entirely once the org has any clients. Dates are relative to
 * the current Indian FY (Apr–Mar) so it stays sensible whenever run.
 */
export async function seedDemoData() {
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.slug, ADMIN_ORG_SLUG)
  });
  if (!org) return;
  const hasClients = await db.query.client.findFirst({
    where: eq(schema.client.organizationId, org.id),
    columns: {
      id: true
    }
  });
  if (hasClients) return;
  const adminUser = await db.query.user.findFirst({
    where: eq(schema.user.username, ADMIN_USERNAME),
    columns: {
      id: true
    }
  });
  const orgId = org.id;
  const now = new Date();
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fy = `${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, "0")}`;
  const d = (monthOffset, day) => new Date(fyStartYear, 3 + monthOffset, day);
  const rel = days => new Date(now.getTime() + days * 86400000);
  const clients = await db.insert(schema.client).values([{
    id: id(),
    organizationId: orgId,
    name: "Sharma Textiles Pvt Ltd",
    type: "company",
    pan: "AAACS1234F",
    gstin: "27AAACS1234F1Z5",
    email: "accounts@sharmatextiles.in",
    city: "Mumbai",
    state: "Maharashtra"
  }, {
    id: id(),
    organizationId: orgId,
    name: "Gupta & Sons",
    type: "firm",
    pan: "AABFG5678K",
    gstin: "07AABFG5678K1Z2",
    email: "guptasons@gmail.com",
    city: "New Delhi",
    state: "Delhi"
  }, {
    id: id(),
    organizationId: orgId,
    name: "Meera Jewellers Pvt Ltd",
    type: "company",
    pan: "AAGCM9012D",
    gstin: "08AAGCM9012D1Z8",
    email: "meera.jewellers@yahoo.in",
    city: "Jaipur",
    state: "Rajasthan"
  }, {
    id: id(),
    organizationId: orgId,
    name: "TechNova Solutions LLP",
    type: "llp",
    pan: "AAUFT3456P",
    gstin: "29AAUFT3456P1ZQ",
    email: "finance@technova.io",
    city: "Bengaluru",
    state: "Karnataka"
  }, {
    id: id(),
    organizationId: orgId,
    name: "Anand Enterprises",
    type: "firm",
    pan: "AAMFA7890R",
    gstin: "27AAMFA7890R1ZX",
    phone: "98220 11223",
    city: "Pune",
    state: "Maharashtra"
  }, {
    id: id(),
    organizationId: orgId,
    name: "Kavita Deshmukh",
    type: "individual",
    pan: "BCLPD2345M",
    email: "kavita.d@gmail.com",
    city: "Nashik",
    state: "Maharashtra"
  }]).returning({
    id: schema.client.id
  });
  const c = clients.map(r => r.id);

  // [clientIdx, fyMonthOffset, day, fee ₹, status, paidFraction, paidDaysLater]
  const invoiceSpecs = [[3, 0, 10, 85_000, "paid", 1, 24], [0, 0, 15, 120_000, "paid", 1, 28], [1, 1, 8, 65_000, "paid", 1, 30], [2, 2, 11, 95_000, "paid", 1, 29], [3, 2, 10, 85_000, "paid", 1, 34], [4, 3, 9, 45_000, "paid", 1, 33], [0, 4, 12, 120_000, "partial", 0.5, 38], [1, 4, 10, 70_000, "sent", 0, 0], [3, 5, 10, 85_000, "paid", 1, 33], [5, 5, 14, 25_000, "sent", 0, 0], [2, 6, 10, 95_000, "partial", 0.5, 30], [4, 6, 12, 55_000, "sent", 0, 0], [3, 7, 8, 85_000, "sent", 0, 0], [0, 7, 10, 120_000, "sent", 0, 0], [1, 7, 16, 30_000, "draft", 0, 0]];
  const payments = [];
  const invoices = invoiceSpecs.map(([ci, m, day, fee, status, frac, payLag], i) => {
    const subtotal = paise(fee);
    const cgst = paise(fee * 0.09);
    const sgst = paise(fee * 0.09);
    const total = subtotal + cgst + sgst;
    const invId = id();
    const invoiceDate = d(m, day);
    const dueDate = new Date(invoiceDate.getTime() + 30 * 86400000);
    if (frac > 0) {
      const tds = paise(Math.round(fee * 0.1 * frac));
      const received = BigInt(Math.round(Number(total) * frac)) - tds;
      payments.push({
        id: id(),
        organizationId: orgId,
        clientId: c[ci],
        invoiceId: invId,
        receiptNo: `RCP/${fy.slice(2)}/${String(payments.length + 1).padStart(3, "0")}`,
        paymentDate: new Date(invoiceDate.getTime() + payLag * 86400000),
        amountReceivedPaise: received,
        tdsDeductedPaise: tds,
        tdsSection: "194J",
        mode: "neft"
      });
    }
    return {
      id: invId,
      organizationId: orgId,
      clientId: c[ci],
      invoiceNo: `AF/${fy.slice(2)}/${String(i + 1).padStart(3, "0")}`,
      fy,
      invoiceDate,
      dueDate,
      subtotalPaise: subtotal,
      cgstPaise: cgst,
      sgstPaise: sgst,
      totalPaise: total,
      status
    };
  });
  await db.insert(schema.invoice).values(invoices);
  await db.insert(schema.payment).values(payments);
  await db.insert(schema.complianceTask).values([{
    id: id(),
    organizationId: orgId,
    clientId: c[0],
    title: "GSTR-3B filing — Oct",
    dueDate: rel(-7),
    period: "Oct",
    status: "pending",
    assignedToId: adminUser?.id
  }, {
    id: id(),
    organizationId: orgId,
    clientId: c[1],
    title: "TDS deposit — Oct",
    dueDate: rel(-11),
    period: "Oct",
    status: "in_progress",
    assignedToId: adminUser?.id
  }, {
    id: id(),
    organizationId: orgId,
    clientId: c[3],
    title: "GSTR-1 filing — Nov",
    dueDate: rel(2),
    period: "Nov",
    status: "pending",
    assignedToId: adminUser?.id
  }, {
    id: id(),
    organizationId: orgId,
    clientId: c[0],
    title: "GSTR-3B filing — Nov",
    dueDate: rel(3),
    period: "Nov",
    status: "pending",
    assignedToId: adminUser?.id
  }, {
    id: id(),
    organizationId: orgId,
    clientId: c[2],
    title: "Advance tax — 3rd instalment",
    dueDate: rel(27),
    period: `FY${fy}`,
    status: "pending"
  }, {
    id: id(),
    organizationId: orgId,
    clientId: c[4],
    title: "ROC annual filing (AOC-4)",
    dueDate: rel(42),
    status: "pending"
  }]);
  console.log(`[seed] demo data: ${clients.length} clients, ${invoices.length} invoices, ${payments.length} payments`);
}

/**
 * Dev-only second demo batch — tops up an already-seeded org so the
 * dashboard feels fuller. Idempotent via the "Verma & Associates"
 * marker client. Dates stay within the current FY so the cashflow
 * chart fills up.
 */
export async function seedDemoDataTopUp() {
  const org = await db.query.organization.findFirst({
    where: eq(schema.organization.slug, ADMIN_ORG_SLUG)
  });
  if (!org) return;
  const orgId = org.id;
  const marker = await db.query.client.findFirst({
    where: and(eq(schema.client.organizationId, orgId), eq(schema.client.name, "Verma & Associates")),
    columns: {
      id: true
    }
  });
  if (marker) return;
  const adminUser = await db.query.user.findFirst({
    where: eq(schema.user.username, ADMIN_USERNAME),
    columns: {
      id: true
    }
  });
  const [invCount] = await db.select({
    count: sql`count(*)`
  }).from(schema.invoice).where(eq(schema.invoice.organizationId, orgId));
  const [payCount] = await db.select({
    count: sql`count(*)`
  }).from(schema.payment).where(eq(schema.payment.organizationId, orgId));
  const now = new Date();
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fy = `${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, "0")}`;
  const d = (monthOffset, day) => new Date(fyStartYear, 3 + monthOffset, day);
  const rel = days => new Date(now.getTime() + days * 86400000);
  const clients = await db.insert(schema.client).values([{
    id: id(),
    organizationId: orgId,
    name: "Verma & Associates",
    type: "firm",
    pan: "AACFV6620Q",
    gstin: "07AACFV6620Q1ZF",
    email: "info@vermaassociates.in",
    city: "Gurugram",
    state: "Haryana"
  }, {
    id: id(),
    organizationId: orgId,
    name: "Rajkot Auto Parts Pvt Ltd",
    type: "company",
    pan: "AAKCR4411M",
    gstin: "24AAKCR4411M1ZB",
    email: "purchase@rajkotauto.com",
    city: "Rajkot",
    state: "Gujarat"
  }, {
    id: id(),
    organizationId: orgId,
    name: "Dr Priya Kapoor",
    type: "individual",
    pan: "BXTPK8821H",
    email: "priya.kapoor@gmail.com",
    city: "Bengaluru",
    state: "Karnataka"
  }]).returning({
    id: schema.client.id
  });
  const c = clients.map(r => r.id);

  // [clientIdx, fyMonthOffset, day, fee ₹, status, paidFraction, paidDaysLater]
  // Offsets ≤ 7 (Nov) keep dates in the past; pay lags spread collections
  // across Jun–Nov so the cashflow chart fills in.
  const invoiceSpecs = [[0, 1, 12, 60_000, "paid", 1, 27], [1, 2, 18, 42_000, "paid", 1, 25], [2, 3, 20, 78_000, "paid", 1, 30], [0, 4, 22, 55_000, "paid", 1, 28], [1, 5, 15, 88_000, "paid", 1, 32], [2, 5, 24, 36_000, "partial", 0.5, 26], [0, 6, 14, 48_000, "paid", 1, 31], [2, 6, 25, 95_000, "partial", 0.4, 20], [1, 7, 6, 66_000, "sent", 0, 0], [0, 7, 12, 34_000, "sent", 0, 0], [2, 7, 17, 52_000, "draft", 0, 0]];
  const base = Number(invCount?.count ?? 0);
  const payBase = Number(payCount?.count ?? 0);
  const payments = [];
  const invoices = invoiceSpecs.map(([ci, m, day, fee, status, frac, payLag], i) => {
    const subtotal = paise(fee);
    const cgst = paise(fee * 0.09);
    const sgst = paise(fee * 0.09);
    const total = subtotal + cgst + sgst;
    const invId = id();
    const invoiceDate = d(m, day);
    const dueDate = new Date(invoiceDate.getTime() + 30 * 86400000);
    if (frac > 0) {
      const tds = paise(Math.round(fee * 0.1 * frac));
      const received = BigInt(Math.round(Number(total) * frac)) - tds;
      payments.push({
        id: id(),
        organizationId: orgId,
        clientId: c[ci],
        invoiceId: invId,
        receiptNo: `RCP/${fy.slice(2)}/${String(payBase + payments.length + 1).padStart(3, "0")}`,
        paymentDate: new Date(invoiceDate.getTime() + payLag * 86400000),
        amountReceivedPaise: received,
        tdsDeductedPaise: tds,
        tdsSection: "194J",
        mode: "neft"
      });
    }
    return {
      id: invId,
      organizationId: orgId,
      clientId: c[ci],
      invoiceNo: `AF/${fy.slice(2)}/${String(base + i + 1).padStart(3, "0")}`,
      fy,
      invoiceDate,
      dueDate,
      subtotalPaise: subtotal,
      cgstPaise: cgst,
      sgstPaise: sgst,
      totalPaise: total,
      status
    };
  });
  payments.push({
    id: id(),
    organizationId: orgId,
    clientId: c[0],
    invoiceId: null,
    receiptNo: `RCP/${fy.slice(2)}/${String(payBase + payments.length + 1).padStart(3, "0")}`,
    paymentDate: rel(-3),
    amountReceivedPaise: paise(25_000),
    tdsDeductedPaise: BigInt(0),
    mode: "upi",
    notes: "Advance for Dec retainer"
  });
  await db.insert(schema.invoice).values(invoices);
  await db.insert(schema.payment).values(payments);
  await db.insert(schema.complianceTask).values([{
    id: id(),
    organizationId: orgId,
    clientId: c[1],
    title: "GSTR-3B filing — Nov",
    dueDate: rel(4),
    period: "Nov",
    status: "pending",
    assignedToId: adminUser?.id
  }, {
    id: id(),
    organizationId: orgId,
    clientId: c[2],
    title: "ITR-V verification",
    dueDate: rel(-4),
    period: "AY 2026-27",
    status: "pending",
    assignedToId: adminUser?.id
  }, {
    id: id(),
    organizationId: orgId,
    clientId: c[0],
    title: "Form 16A issuance — Q2",
    dueDate: rel(9),
    period: "Q2",
    status: "in_progress",
    assignedToId: adminUser?.id
  }, {
    id: id(),
    organizationId: orgId,
    clientId: c[1],
    title: "GSTR-1 filing — Dec",
    dueDate: rel(21),
    period: "Dec",
    status: "pending"
  }]);
  console.log(`[seed] demo top-up: ${clients.length} clients, ${invoices.length} invoices, ${payments.length} payments`);
}
