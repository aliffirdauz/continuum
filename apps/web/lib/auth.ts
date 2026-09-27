import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

const authenticationResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: z.object({
    id: z.string().min(1),
    email: z.email(),
    name: z.string().min(1),
    role: z.enum(["EMPLOYEE", "MANAGER", "KNOWLEDGE_ADMIN"]),
  }),
});

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "Northstar demo account",
      credentials: {
        email: { label: "Work email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        try {
          const response = await fetch(
            `${process.env.INTERNAL_API_URL ?? "http://localhost:3001/api/v1"}/auth/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
              cache: "no-store",
              signal: AbortSignal.timeout(5_000),
            },
          );

          if (!response.ok) {
            return null;
          }

          const result = authenticationResponseSchema.safeParse(
            await response.json(),
          );

          if (!result.success) {
            return null;
          }

          return {
            ...result.data.user,
            accessToken: result.data.accessToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }

      return session;
    },
  },
  session: {
    maxAge: 60 * 60,
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
