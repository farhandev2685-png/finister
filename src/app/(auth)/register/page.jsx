"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}
export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name"));
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const firmName = String(fd.get("firmName"));
    const {
      error: signUpError
    } = await authClient.signUp.email({
      name,
      email,
      password
    });
    if (signUpError) {
      setLoading(false);
      setError(signUpError.message ?? "Registration failed");
      return;
    }

    // Create the firm (organization = tenant)
    const {
      error: orgError
    } = await authClient.organization.create({
      name: firmName,
      slug: `${slugify(firmName)}-${Math.random().toString(36).slice(2, 6)}`
    });
    setLoading(false);
    if (orgError) {
      setError(orgError.message ?? "Account created but firm setup failed — try again from onboarding");
      router.push("/onboarding");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }
  return <Card className="w-full max-w-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl">Register your firm</CardTitle>
        <CardDescription>Create an account and set up your practice</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="firmName">Firm name</Label>
            <Input id="firmName" name="firmName" required placeholder="Shah & Associates" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" name="name" required autoComplete="name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="bg-lime font-semibold text-forest hover:bg-lime/90" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>;
}
