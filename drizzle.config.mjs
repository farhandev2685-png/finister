import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;

export default defineConfig(
  url
    ? {
        dialect: "postgresql",
        schema: "./src/lib/db/schema.js",
        out: "./drizzle",
        dbCredentials: { url },
      }
    : {
        dialect: "postgresql",
        driver: "pglite",
        schema: "./src/lib/db/schema.js",
        out: "./drizzle",
        dbCredentials: { url: "./.data/pg" },
      },
);
