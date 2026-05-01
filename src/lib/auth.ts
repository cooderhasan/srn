import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations";
import type { UserRole, UserStatus } from "@prisma/client";

declare module "next-auth" {
    interface User {
        id: string;
        email: string;
        name?: string | null;
        role: UserRole;
        status: UserStatus;
        companyName?: string | null;
        discountGroupId?: string | null;
        discountRate?: number;
    }

    interface Session {
        user: User;
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        id: string;
        name?: string | null;
        role: UserRole;
        status: UserStatus;
        companyName?: string | null;
        discountGroupId?: string | null;
        discountRate?: number;
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "E-posta", type: "email" },
                password: { label: "Şifre", type: "password" },
            },
            async authorize(credentials) {
                const validatedFields = loginSchema.safeParse(credentials);

                if (!validatedFields.success) {
                    return null;
                }

                const { email, password } = validatedFields.data;

                const user = await prisma.user.findUnique({
                    where: { email },
                    include: {
                        discountGroup: true,
                    },
                });

                if (!user || !user.passwordHash) {
                    return null;
                }

                const passwordsMatch = await bcrypt.compare(password, user.passwordHash);

                if (!passwordsMatch) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    status: user.status,
                    companyName: user.companyName,
                    discountGroupId: user.discountGroupId,
                    discountRate: user.discountGroup
                        ? Number(user.discountGroup.discountRate)
                        : 0,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.name = user.name;
                token.role = user.role;
                token.status = user.status;
                token.companyName = user.companyName;
                token.discountGroupId = user.discountGroupId;
                token.discountRate = user.discountRate;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.name = token.name as string | null;
                session.user.role = token.role as UserRole;
                session.user.status = token.status as UserStatus;
                session.user.companyName = token.companyName as string | null;
                session.user.discountGroupId = token.discountGroupId as string | null;
                session.user.discountRate = token.discountRate as number;
            }

            // Critical Fix: Ensure everything in session is serializable
            // This strips any remaining Decimal objects or complex types
            try {
                return JSON.parse(JSON.stringify(session));
            } catch (e) {
                console.error("LOGIN_DEBUG: Serialization error", e);
                return session;
            }
        },
    },
    pages: {
        signIn: "/login",
    },
    // Explicitly configure cookies to ensure consistent naming behind proxy types
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
    session: {
        strategy: "jwt",
    },
});

// Helper functions for role checking
export function isAdmin(role: UserRole) {
    return role === "ADMIN";
}

export function isOperator(role: UserRole) {
    return role === "ADMIN" || role === "OPERATOR";
}

export function isDealer(role: UserRole) {
    return role === "DEALER";
}

export function isApproved(status: UserStatus) {
    return status === "APPROVED";
}
