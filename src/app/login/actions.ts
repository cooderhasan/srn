"use server";

import { auth } from "@/lib/auth";

export async function getUserRole() {
    try {
        console.log("getUserRole started");
        const session = await auth();
        console.log("getUserRole session found:", !!session);
        return session?.user?.role;
    } catch (error) {
        console.error("getUserRole error:", error);
        return null;
    }
}
