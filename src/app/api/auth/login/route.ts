import { NextRequest } from "next/server";
import { backendLogin } from "@/lib/server/platform-api";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as { email?: unknown; password?: unknown };

  if (typeof payload.email !== "string" || typeof payload.password !== "string") {
    return Response.json(
      {
        error: {
          code: "bad_request",
          message: "Email and password are required."
        }
      },
      { status: 400 }
    );
  }

  return backendLogin(request, {
    email: payload.email,
    password: payload.password
  });
}
