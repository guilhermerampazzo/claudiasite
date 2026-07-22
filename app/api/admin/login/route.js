import { NextResponse } from "next/server";
import { createSessionCookie, setSession, validateCredentials } from "@/lib/auth";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!validateCredentials(body.username, body.password)) {
    return NextResponse.json({ error: "Usuario ou senha invalidos." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  setSession(response, createSessionCookie(body.username));
  return response;
}
