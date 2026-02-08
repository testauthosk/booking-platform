import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          const loginId = credentials.email // email або +380XXXXXXXXX

          const user = await prisma.user.findUnique({
            where: { email: loginId },
            include: { salon: true }
          })

          if (!user) {
            return null
          }

          // OTP login: password starts with __otp__
          if (credentials.password.startsWith('__otp__')) {
            const otpCode = credentials.password.replace('__otp__', '')

            const otp = await prisma.otpCode.findFirst({
              where: {
                phone: loginId,
                code: otpCode,
                type: 'LOGIN',
                verified: true,
                expiresAt: { gte: new Date() },
              },
              orderBy: { createdAt: 'desc' },
            })

            if (!otp) {
              console.log('[AUTH] OTP not found or expired for:', loginId)
              return null
            }

            // Видаляємо використаний OTP
            await prisma.otpCode.delete({ where: { id: otp.id } })

            console.log('[AUTH] OTP login successful for:', loginId)
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              salonId: user.salonId,
            }
          }

          // Password login
          const passwordMatch = await bcrypt.compare(credentials.password, user.passwordHash)

          if (!passwordMatch) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            salonId: user.salonId,
          }
        } catch (error) {
          console.error('[AUTH] Error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.salonId = user.salonId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.salonId = token.salonId as string | null
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 90 * 24 * 60 * 60, // 90 днів
    updateAge: 24 * 60 * 60,   // Оновлювати JWT кожні 24 години
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production',
}
