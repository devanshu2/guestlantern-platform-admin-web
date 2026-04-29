import { NextRequest } from "next/server";
import { proxyHealthRequest } from "@/lib/server/platform-api";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  return proxyHealthRequest(request, `/health/${params.path.join("/")}`);
}
