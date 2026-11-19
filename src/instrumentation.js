export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const {
      migrateDb
    } = await import("@/lib/db");
    await migrateDb();
    if (!process.env.DATABASE_URL) {
      const {
        seedDefaultAdmin,
        seedDemoData,
        seedDemoDataTopUp
      } = await import("@/lib/seed");
      await seedDefaultAdmin().catch(e => console.warn("[seed] default admin skipped:", e));
      await seedDemoData().catch(e => console.warn("[seed] demo data skipped:", e));
      await seedDemoDataTopUp().catch(e => console.warn("[seed] demo top-up skipped:", e));
    }
  }
}
