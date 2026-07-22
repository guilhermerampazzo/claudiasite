import crypto from "node:crypto";
import { NextResponse } from "next/server";

const cookieName = "ce_session";

function secret() {
  return process.env.SESSION_SECRET || "dev-only-change-me";
}

function b64(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionCookie(username) {
  const payload = b64(
    JSON.stringify({
      username,
      exp: Date.now() + 1000 * 60 * 60 * 12
    })
  );
  return `${payload}.${sign(payload)}`;
}

export function verifySessionCookie(value) {
  if (!value || !value.includes(".")) return null;
  const [payload, signature] = value.split(".");
  if (sign(payload) !== signature) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getSession(request) {
  return verifySessionCookie(request.cookies.get(cookieName)?.value);
}

export function requireAdmin(request) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }
  return null;
}

export function setSession(response, token) {
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: 60 * 60 * 12,
    path: "/"
  });
}

export function clearSession(response) {
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: 0,
    path: "/"
  });
}

export function validateCredentials(username, password) {
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin";
  return String(username || "").trim() === adminUser && String(password || "").trim() === adminPassword;
}
