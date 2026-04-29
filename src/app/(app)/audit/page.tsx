import { Suspense } from "react";
import { AuditPage } from "@/features/audit/audit-page";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading audit filters...</p>}>
      <AuditPage />
    </Suspense>
  );
}
