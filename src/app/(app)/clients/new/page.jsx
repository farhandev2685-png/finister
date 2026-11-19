import { PageHeader } from "@/components/page-header";
import { ClientForm } from "@/components/forms/client-form";
import { Card, CardContent } from "@/components/ui/card";
export default function NewClientPage() {
  return <div>
      <PageHeader title="New client" />
      <Card>
        <CardContent className="pt-6">
          <ClientForm />
        </CardContent>
      </Card>
    </div>;
}
