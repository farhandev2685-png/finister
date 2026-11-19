import { seedDemoDataTopUp } from "@/lib/seed";

// Dev-only helper: POST to top up the embedded PGlite demo dataset.
export async function POST() {
  if (process.env.NODE_ENV !== "development" || process.env.DATABASE_URL) {
    return Response.json({ error: "dev seed only runs in local development" }, { status: 403 });
  }
  await seedDemoDataTopUp();
  return Response.json({ ok: true });
}
