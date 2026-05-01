'use server'

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getPolicy(slug: string) {
    const policy = await prisma.policy.findUnique({
        where: { slug },
    })
    return policy
}

export async function updatePolicy(slug: string, title: string, content: string) {
    try {
        await prisma.policy.upsert({
            where: { slug },
            update: { title, content },
            create: { slug, title, content },
        })

        revalidatePath(`/policies/${slug}`)
        // Also revalidate the specific path mapping if differs
        // e.g. /policies/membership might map to slug 'membership-agreement'

        return { success: true }
    } catch (error) {
        console.error("Policy update error:", error)
        return { success: false, error: "Güncelleme başarısız oldu" }
    }
}

export async function getAllPolicies() {
    try {
        return await prisma.policy.findMany({
            orderBy: { title: "asc" },
        })
    } catch (error) {
        console.warn("Could not fetch policies, returning empty array.", error)
        return []
    }
}

export async function deletePolicy(slug: string) {
    try {
        await prisma.policy.delete({
            where: { slug },
        })

        revalidatePath("/admin/policies")
        revalidatePath(`/policies/${slug}`)

        return { success: true }
    } catch (error) {
        console.error("Policy delete error:", error)
        return { success: false, error: "Silme işlemi başarısız oldu" }
    }
}
