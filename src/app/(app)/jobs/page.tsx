import { Suspense } from "react";
import { JobsPage } from "@/features/jobs/jobs-page";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading jobs...</p>}>
      <JobsPage />
    </Suspense>
  );
}
