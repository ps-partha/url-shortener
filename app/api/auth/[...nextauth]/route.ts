import NextAuth from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import bcrypt from "bcryptjs"
import type { DefaultJWT } from "next-auth/jwt"
import type { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import prisma from "@/lib/prisma"

// Extend JWT token type
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    role?: string
    name?: string
    username?: string
    image?: string
    balance?: number
    isLoggedIn?: boolean
  }
}

declare module "next-auth" {
  interface User {
    id: string
    name : string
    username?: string
    role?: string
    image?: string
    balance?: number
    isLoggedIn?: boolean
  }
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      username?: string
      image?: string | null
      role?: string
      balance?: number
      isLoggedIn?: boolean
    }
  }
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? "",
          username: user.username ?? undefined,
          role: user.role ?? undefined,
          image: user.image ?? undefined,
          balance: user.balance ?? 0,
          isLoggedIn: true,
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        let dbUser = await prisma.user.findUnique({
          where: { email: profile.email },
        })

        if (!dbUser) {
          const baseUsername = profile.name?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "user"
          const username = `${baseUsername}${Math.floor(Math.random() * 10000)}`
          const profile_image = (profile as any).picture || ""

          dbUser = await prisma.user.create({
            data: {
              username,
              name: profile.name ?? "",
              email: profile.email,
              image: profile_image,
              role: "user",
            },
          })
        }

        user.id = dbUser.id
        user.username = dbUser.username ?? undefined
        user.role = dbUser.role ?? undefined
        user.image = dbUser.image ?? undefined
        user.balance = dbUser.balance ?? 0
        user.isLoggedIn = true
      }

      return true
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.role = user.role
        token.email = user.email
        token.name = user.name
        token.image = user.image
        token.balance = user.balance
        token.isLoggedIn = user.isLoggedIn
      }
      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.username = token?.username || token.username
        session.user.role = token?.role || token.role
        session.user.email = token.email
        session.user.name = token.name
        session.user.image = token?.image || token.image
        session.user.balance = token?.balance ?? 0
        session.user.isLoggedIn = token.isLoggedIn ?? false
      }
      return session
    }
    ,
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.AUTH_SECRET!,
}


const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
