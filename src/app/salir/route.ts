import { signOut } from "@/auth";

// Cierra una sesión cuyo usuario ya no existe (JWT válido pero huérfano).
// Sin esto, /login redirigiría a / y / de vuelta a /login en bucle.
export async function GET() {
  await signOut({ redirectTo: "/login" });
}
