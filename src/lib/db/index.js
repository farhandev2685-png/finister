import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";
const PGLITE_DIR = path.join(process.cwd(), ".data", "pg");
const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

// Singleton must live on globalThis: Next/Turbopack can evaluate this module in
// separate graphs (RSC vs route handlers), and a second PGlite on the same data
// dir silently fails — which makes auth.api.getSession() return null only in
// server-component renders.
const globalForDb = globalThis;
function createDb() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url);
    // drizzle-orm's postgres-js driver replaces the outbound serializers
    // for date/timestamp OIDs with a passthrough (drizzle-orm#5789), which
    // makes Date bind params crash with ERR_INVALID_ARG_TYPE. Capture the
    // native serializers and restore them after drizzle() mutates the client.
    const dateSerializers = {};
    for (const oid of ["1184", "1082", "1083", "1114", "1182", "1185", "1115", "1231"]) {
      dateSerializers[oid] = client.options.serializers[oid];
    }
    const db = drizzlePostgres(client, {
      schema
    });
    for (const [oid, serializer] of Object.entries(dateSerializers)) {
      client.options.serializers[oid] = serializer;
    }
    return db;
  }
  // Dev fallback: embedded Postgres, no setup needed.
  fs.mkdirSync(PGLITE_DIR, {
    recursive: true
  });
  return drizzlePglite(new PGlite(PGLITE_DIR), {
    schema
  });
}
export function getDb() {
  if (!globalForDb.__dbInstance) globalForDb.__dbInstance = createDb();
  return globalForDb.__dbInstance;
}
export async function migrateDb() {
  if (!globalForDb.__migratePromise) {
    globalForDb.__migratePromise = (async () => {
      const url = process.env.DATABASE_URL;
      if (url) {
        await migratePostgres(getDb(), {
          migrationsFolder: MIGRATIONS_DIR
        });
      } else {
        await migratePglite(getDb(), {
          migrationsFolder: MIGRATIONS_DIR
        });
      }
    })().catch(e => {
      globalForDb.__migratePromise = null;
      throw e;
    });
  }
  return globalForDb.__migratePromise;
}

// Lazily-initialized proxy so importing this module is side-effect free
// (keeps better-auth CLI / builds from booting the DB).
export const db = new Proxy({}, {
  get(_target, prop) {
    const instance = getDb();
    const value = instance[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  }
});
export { schema };
