import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

const ALLOWED_EMAIL = 'vibekbin305@gmail.com'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    signIn({ user }) {
      // Strict allowlist — only one email may ever authenticate
      return user.email === ALLOWED_EMAIL
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ''
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
