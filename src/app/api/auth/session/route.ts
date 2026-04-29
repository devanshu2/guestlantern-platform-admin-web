import { NextRequest } from "next/server";
import { proxyPlatformRequest } from "@/lib/server/platform-api";

export async function GET(request: NextRequest) {
  return proxyPlatformRequest(request, "/platform/bootstrap");
}
