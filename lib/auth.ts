// lib/auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import NextAuth, { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import type { Adapter } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      // expose user.id in session
      if (session.user) {
        (session.user as any).id = user.id;
      }
      return session;
    },
  },
};
