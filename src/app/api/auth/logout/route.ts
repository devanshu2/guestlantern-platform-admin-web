import { NextRequest } from "next/server";
import { verifyCsrf } from "@/lib/security/csrf";
import { backendLogout } from "@/lib/server/platform-api";

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return Response.json(
      {
        error: {
          code: "csrf_failed",
          message: "Security check failed. Reload the page and try again."
        }
      },
      { status: 403 }
    );
  }

  return backendLogout(request);
}
