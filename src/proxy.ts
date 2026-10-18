import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Chequeo optimista (solo cookie/JWT). La verificación real ocurre cerca de los
// datos: getCurrentUser() en src/lib/dal.ts y en cada Server Action.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webp|jpg|jpeg)$).*)",
  ],
};
