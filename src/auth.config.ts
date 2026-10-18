import type { NextAuthConfig } from "next-auth";

// Configuración compartida entre `auth.ts` y `proxy.ts`. No importa Prisma ni
// argon2: el proxy solo hace chequeos optimistas leyendo el JWT de la cookie.
const PUBLIC_ROUTES = ["/login", "/registro"];

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      if (nextUrl.pathname === "/salir") return true;
      if (PUBLIC_ROUTES.includes(nextUrl.pathname)) {
        return isLoggedIn ? Response.redirect(new URL("/", nextUrl)) : true;
      }
      // false → Auth.js redirige a pages.signIn conservando el callbackUrl.
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
