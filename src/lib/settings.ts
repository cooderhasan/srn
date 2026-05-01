import { prisma } from "@/lib/db";

export async function getSiteSettings() {
    try {
        const settings = await prisma.siteSettings.findUnique({
            where: { key: "general" },
        });
        return (settings?.value as Record<string, string>) || {};
    } catch (error) {
        console.warn("Could not fetch site settings, using defaults.", error);
        return {};
    }
}
