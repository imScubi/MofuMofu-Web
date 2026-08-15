import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-cookie";

// Chequeo rápido (solo presencia de cookie) en el edge; la validación
// criptográfica completa ocurre en el layout del dashboard (runtime Node).
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(ADMIN_COOKIE_NAME);

  if (!hasSession) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*"],
};
