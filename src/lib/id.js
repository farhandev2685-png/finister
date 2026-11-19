import { randomBytes } from "node:crypto";
export function newId() {
  return randomBytes(12).toString("base64url");
}
