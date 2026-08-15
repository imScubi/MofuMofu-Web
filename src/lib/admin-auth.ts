import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-cookie";

export { ADMIN_COOKIE_NAME };

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error("Falta ADMIN_PASSWORD / ADMIN_SESSION_SECRET en las variables de entorno.");
  }
  return secret;
}

export function signAdminToken(): string {
  const issuedAt = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(issuedAt)
    .digest("hex");
  return `${issuedAt}.${signature}`;
}

function isValidToken(token: string): boolean {
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;

  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(issuedAt)
    .digest("hex");

  if (expected.length !== signature.length) return false;
  const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!valid) return false;

  // Sesión válida por 12 horas.
  const ageMs = Date.now() - Number(issuedAt);
  return ageMs >= 0 && ageMs < 12 * 60 * 60 * 1000;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    return isValidToken(token);
  } catch {
    return false;
  }
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  if (password.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}
