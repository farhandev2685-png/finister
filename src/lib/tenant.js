import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "./auth";
import { db, schema } from "./db";
/**
 * Resolve session + active organization + member role.
 * Redirects to /login or /onboarding when unauthenticated / orgless.
 * Memoized per request via React cache() — layouts and pages can both call it
 * without paying for the session/org lookup twice.
 */
export const getCtx = cache(async function getCtx() {
  const h = await headers();
  const session = await auth.api.getSession({
    headers: h
  });
  if (!session) redirect("/login");
  let orgId = session.session.activeOrganizationId;
  if (!orgId) {
    // Fall back to the user's first membership
    const m = await db.query.member.findFirst({
      where: eq(schema.member.userId, session.user.id)
    });
    if (!m) redirect("/onboarding");
    orgId = m.organizationId;
    try {
      await auth.api.setActiveOrganization({
        body: {
          organizationId: orgId
        },
        headers: await headers()
      });
    } catch {
      // non-fatal: we still have orgId for this request
    }
  }
  const [membership, org] = await Promise.all([db.query.member.findFirst({
    where: and(eq(schema.member.organizationId, orgId), eq(schema.member.userId, session.user.id))
  }), db.query.organization.findFirst({
    where: eq(schema.organization.id, orgId)
  })]);
  if (!membership || !org) redirect("/onboarding");
  return {
    userId: session.user.id,
    userName: session.user.name,
    email: session.user.email,
    orgId,
    orgName: org.name,
    role: membership.role ?? "member"
  };
});
export function requireAdmin(ctx) {
  if (ctx.role === "member") throw new Error("Insufficient permissions");
}
