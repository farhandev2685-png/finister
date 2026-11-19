"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}
export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const firmName = String(fd.get("firmName"));
    const {
      error
    } = await authClient.organization.create({
      name: firmName,
      slug: `${slugify(firmName)}-${Math.random().toString(36).slice(2, 6)}`
    });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Could not create firm");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }
  return <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Set up your firm</CardTitle>
          <CardDescription>
            You&apos;re not part of a firm yet. Create one, or ask a colleague to invite you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="firmName">Firm name</Label>
              <Input id="firmName" name="firmName" required placeholder="Shah & Associates" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create firm"}
            </Button>
            <Button type="button" variant="ghost" onClick={async () => {
            await authClient.signOut();
            router.push("/login");
          }}>
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>;
}
