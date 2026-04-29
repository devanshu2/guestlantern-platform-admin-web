import { Suspense } from "react";
import { LoadingState } from "@/components/ui/data-state";
import { JobsPage } from "@/features/jobs/jobs-page";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState>Loading jobs...</LoadingState>}>
      <JobsPage />
    </Suspense>
  );
}
