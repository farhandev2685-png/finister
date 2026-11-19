"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { generateTasksForFy } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
export function GenerateTasksButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return <Button variant="outline" disabled={loading} onClick={async () => {
    setLoading(true);
    try {
      const {
        created
      } = await generateTasksForFy();
      toast.success(created ? `Generated ${created} tasks` : "All tasks already exist for this FY");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }}>
      <CalendarPlus className="mr-1 h-4 w-4" />
      {loading ? "Generating…" : "Generate FY tasks"}
    </Button>;
}
