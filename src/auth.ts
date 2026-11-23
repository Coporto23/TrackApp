import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { clearLoginFailures, clientIp, loginRetryAfter, recordLoginFailure } from "@/lib/auth-throttle";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation/auth";

/** Login bloqueado por demasiados intentos fallidos (la acción muestra el tiempo restante). */
export class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      // El límite se aplica aquí y no solo en la acción: así también cubre el
      // endpoint propio de Auth.js (/api/auth/callback/credentials).
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const ip = clientIp(request.headers);
        if (loginRetryAfter(email, ip) > 0) throw new TooManyAttempts();

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, password: true },
        });
        const valid = user ? await verifyPassword(user.password, password) : false;
        if (!user || !valid) {
          recordLoginFailure(email, ip);
          return null;
        }

        clearLoginFailures(email);
        return { id: user.id, email: user.email };
      },
    }),
  ],
});
