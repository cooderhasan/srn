"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

const addressSchema = z.object({
    address: z.string().min(1, "Adres zorunludur"),
    city: z.string().min(1, "Şehir zorunludur"),
    district: z.string().optional(),
    phone: z.string().min(1, "Telefon zorunludur"),
});

const profileSchema = z.object({
    name: z.string().min(2, "Ad soyad en az 2 karakter olmalıdır"),
    companyName: z.string().optional(),
    phone: z.string().min(10, "Geçerli bir telefon numarası giriniz"),
    taxNumber: z.string().optional(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Mevcut şifre zorunludur"),
    newPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalıdır"),
});

export async function updateAddress(formData: FormData) {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: "Oturum açmanız gerekiyor." };
    }

    const rawData = {
        address: formData.get("address"),
        city: formData.get("city"),
        district: formData.get("district"),
        phone: formData.get("phone"),
    };

    const validated = addressSchema.safeParse(rawData);

    if (!validated.success) {
        return { success: false, error: validated.error.issues[0].message };
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                address: validated.data.address,
                city: validated.data.city,
                district: validated.data.district,
                phone: validated.data.phone,
            },
        });

        revalidatePath("/account/addresses");
        return { success: true };
    } catch (error) {
        console.error("Update address error:", error);
        return { success: false, error: "Adres güncellenirken bir hata oluştu." };
    }
}

export async function updateProfile(formData: FormData) {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: "Oturum açmanız gerekiyor." };
    }

    const rawData = {
        name: formData.get("name"),
        companyName: formData.get("companyName"),
        phone: formData.get("phone"),
        taxNumber: formData.get("taxNumber"),
    };

    const validated = profileSchema.safeParse(rawData);

    if (!validated.success) {
        return { success: false, error: validated.error.issues[0].message };
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name: validated.data.name,
                companyName: validated.data.companyName || null,
                phone: validated.data.phone,
                taxNumber: validated.data.taxNumber,
            },
        });

        revalidatePath("/account/profile");
        return { success: true };
    } catch (error) {
        console.error("Update profile error:", error);
        return { success: false, error: "Profil güncellenirken bir hata oluştu." };
    }
}

export async function updatePassword(formData: FormData) {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: "Oturum açmanız gerekiyor." };
    }

    const rawData = {
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
    };

    const validated = passwordSchema.safeParse(rawData);

    if (!validated.success) {
        return { success: false, error: validated.error.issues[0].message };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user || !user.passwordHash) {
            return { success: false, error: "Kullanıcı bulunamadı." };
        }

        const passwordsMatch = await bcrypt.compare(
            validated.data.currentPassword,
            user.passwordHash
        );

        if (!passwordsMatch) {
            return { success: false, error: "Mevcut şifreniz hatalı." };
        }

        const hashedPassword = await bcrypt.hash(validated.data.newPassword, 10);

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                passwordHash: hashedPassword,
            },
        });

        revalidatePath("/account/profile");
        return { success: true };
    } catch (error) {
        console.error("Update password error:", error);
        return { success: false, error: "Şifre güncellenirken bir hata oluştu." };
    }
}
