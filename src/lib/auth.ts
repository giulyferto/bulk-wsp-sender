import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getAuth } from "firebase-admin/auth";
import "@/lib/firebase"; // ensure Admin SDK is initialized

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      id: "google-firebase",
      name: "Google",
      credentials: { idToken: { type: "text" } },
      async authorize(credentials) {
        if (!credentials?.idToken) return null;
        const decoded = await getAuth().verifyIdToken(credentials.idToken);
        return { id: decoded.uid, email: decoded.email ?? "" };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
};
