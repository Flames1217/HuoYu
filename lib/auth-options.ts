import type { AuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

import { getSettings } from "@/lib/settings-store";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin Password",
      credentials: {
        password: { label: "?????", type: "password" },
      },
      async authorize(credentials) {
        const envPassword = process.env.PASSWORD;
        const password = credentials?.password;

        if (!envPassword) {
          console.error("[NextAuth][authorize] PASSWORD is not configured.");
          return null;
        }

        if (!password || password !== envPassword) {
          return null;
        }

        const settings = await getSettings({ profile: {} });
        return {
          id: "admin",
          name: "admin",
          image: settings?.profile?.avatar_url || null,
        } as User;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  pages: {
    signIn: "/admin",
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user?.image) token.picture = user.image;
      if (user?.name) token.name = user.name;
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        if (token.picture) session.user.image = token.picture as string;
        if (token.name) session.user.name = token.name;
        (session.user as any).role = "admin";
      }
      return session;
    },
  },
};
