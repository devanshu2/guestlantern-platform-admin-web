import { Suspense } from "react";
import { LoadingState } from "@/components/ui/data-state";
import { AuditPage } from "@/features/audit/audit-page";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState>Loading audit filters...</LoadingState>}>
      <AuditPage />
    </Suspense>
  );
}
