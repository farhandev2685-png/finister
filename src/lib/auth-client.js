"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient, usernameClient } from "better-auth/client/plugins";
const envBaseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
export const authClient = createAuthClient({
  ...(envBaseURL && URL.canParse(envBaseURL) ? { baseURL: envBaseURL } : {}),
  plugins: [organizationClient(), usernameClient()]
});
export const {
  useSession,
  signIn,
  signUp,
  signOut,
  organization
} = authClient;
