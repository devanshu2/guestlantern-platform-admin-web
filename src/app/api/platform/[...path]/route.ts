import { NextRequest } from "next/server";
import { proxyPlatformRequest } from "@/lib/server/platform-api";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function handler(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  return proxyPlatformRequest(request, `/platform/${params.path.join("/")}`);
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handler(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handler(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handler(request, context);
}
