import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/client";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  resetRateLimit,
  RATE_LIMITS,
} from "@/lib/utils/rateLimit";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
if (!NEXTAUTH_SECRET && process.env.NODE_ENV === "production") {
  // Loud signal — NextAuth will refuse to issue JWTs without a secret in prod.
  logger.error("auth.missing_nextauth_secret", {
    msg: "NEXTAUTH_SECRET is not set — sessions will fail in production.",
  });
}

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * NextAuth configuration — Khan Bhai S.
 *
 * - Strategy: JWT (no DB session table needed)
 * - Provider: Credentials (admin email + password)
 * - Cookie: __Secure-* in production for HTTPS-only sessions
 * - Rate limiting: per-email & per-IP keyed in `authorize`
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) {
          throw new Error("Invalid credentials");
        }

        // Best-effort IP for rate-limit keys.
        const ip =
          (req?.headers as Record<string, string> | undefined)?.[
            "x-forwarded-for"
          ]?.split(",")[0]?.trim() ||
          (req?.headers as Record<string, string> | undefined)?.["x-real-ip"] ||
          "unknown";

        const ipKey = `auth:login:ip:${ip}`;
        const emailKey = `auth:login:email:${email}`;

        const ipRl = checkRateLimit(
          ipKey,
          RATE_LIMITS.AUTH_LOGIN_IP.limit,
          RATE_LIMITS.AUTH_LOGIN_IP.windowMs
        );
        const emailRl = checkRateLimit(
          emailKey,
          RATE_LIMITS.AUTH_LOGIN_EMAIL.limit,
          RATE_LIMITS.AUTH_LOGIN_EMAIL.windowMs
        );

        if (!ipRl.ok || !emailRl.ok) {
          logger.warn("auth.login_rate_limited", { email, ip });
          throw new Error(
            "Too many login attempts. Please wait a few minutes and try again."
          );
        }

        try {
          const admin = await prisma.admin.findUnique({
            where: { email },
          });

          if (!admin) {
            // Same generic error for missing user vs bad password — prevents
            // user-enumeration attacks.
            logger.info("auth.login_failed", {
              email,
              ip,
              reason: "user_not_found",
            });
            throw new Error("Invalid email or password");
          }

          const ok = await bcrypt.compare(password, admin.password);
          if (!ok) {
            logger.info("auth.login_failed", {
              email,
              ip,
              reason: "bad_password",
            });
            throw new Error("Invalid email or password");
          }

          // Successful login — clear failure counters & update last_login.
          resetRateLimit(ipKey);
          resetRateLimit(emailKey);

          await prisma.admin
            .update({
              where: { id: admin.id },
              data: { last_login: new Date() },
            })
            .catch((err) => {
              // Non-fatal — we don't want a transient DB issue to block login.
              logger.warn("auth.last_login_update_failed", { err });
            });

          logger.info("auth.login_success", {
            adminId: admin.id,
            email: admin.email,
            role: admin.role,
            ip,
          });

          return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
          };
        } catch (error) {
          // Never leak the underlying DB error message — translate.
          if (
            error instanceof Error &&
            (error.message.startsWith("Invalid") ||
              error.message.startsWith("Too many"))
          ) {
            throw error;
          }
          logger.error("auth.login_internal_error", { error });
          throw new Error("Authentication failed. Please try again.");
        }
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = (user as any).id;
        token.email = (user as any).email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).email = token.email ?? session.user.email;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60, // 12 hours
    updateAge: 60 * 60, // refresh JWT once per hour while active
  },
  jwt: {
    maxAge: 12 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: IS_PROD
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: IS_PROD,
      },
    },
  },
  debug: false,
  secret: NEXTAUTH_SECRET,
};
