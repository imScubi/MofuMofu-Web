// Constante compartida entre el proxy (edge runtime) y admin-auth.ts
// (node runtime). Este archivo no debe importar nada de Node ni de
// "next/headers" para poder correr en el edge.
export const ADMIN_COOKIE_NAME = "mofu_admin_session";
