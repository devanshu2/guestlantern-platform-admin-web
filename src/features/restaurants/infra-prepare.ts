import { platformApi } from "@/lib/api/client";
import type { ProvisionRestaurantJobStatus, RestaurantInfraPrepareReceipt } from "@/lib/api/types";

const terminalStatuses = new Set(["succeeded", "failed", "cancelled"]);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function queueInfraPrepare(restaurantId: string) {
  return platformApi<RestaurantInfraPrepareReceipt>(`/restaurants/${restaurantId}/infra/prepare`, {
    method: "POST"
  });
}

export async function pollProvisioningJobUntilTerminal(
  jobId: string,
  onTerminal: (status: ProvisionRestaurantJobStatus) => void,
  onError: (message: string) => void
) {
  try {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await delay(attempt === 0 ? 800 : 2_000);
      const status = await platformApi<ProvisionRestaurantJobStatus>(
        `/restaurants/provisioning-jobs/${jobId}`
      );
      if (terminalStatuses.has(String(status.job_status))) {
        onTerminal(status);
        return;
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err.message : "Could not poll infra prepare job.");
  }
}
