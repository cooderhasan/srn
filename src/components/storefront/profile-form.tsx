"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/app/(storefront)/account/actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProfileFormProps {
    user: {
        name?: string | null;
        companyName?: string | null;
        email: string;
        phone?: string | null;
        taxNumber?: string | null;
    };
}

export function ProfileForm({ user }: ProfileFormProps) {
    const [loading, setLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        const result = await updateProfile(formData);
        setLoading(false);

        if (result.success) {
            toast.success("Profil bilgileriniz güncellendi.");
        } else {
            toast.error(result.error);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="name">Ad Soyad</Label>
                    <Input
                        id="name"
                        name="name"
                        defaultValue={user.name || ""}
                        placeholder="Ad Soyad"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="companyName">Firma Adı</Label>
                    <Input
                        id="companyName"
                        name="companyName"
                        defaultValue={user.companyName || ""}
                        placeholder="Firma Adı (Kurumsal üyeler için)"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input
                        id="email"
                        defaultValue={user.email}
                        disabled
                        className="bg-gray-100 dark:bg-gray-800"
                    />
                    <p className="text-xs text-gray-500">E-posta adresi değiştirilemez.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                        id="phone"
                        name="phone"
                        defaultValue={user.phone || ""}
                        placeholder="05XX XXX XX XX"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="taxNumber">Vergi Numarası / T.C.</Label>
                    <Input
                        id="taxNumber"
                        name="taxNumber"
                        defaultValue={user.taxNumber || ""}
                    />
                </div>
            </div>
            <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Bilgileri Güncelle
                </Button>
            </div>
        </form>
    );
}
