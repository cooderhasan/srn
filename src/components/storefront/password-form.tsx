"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/app/(storefront)/account/actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function PasswordForm() {
    const [loading, setLoading] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        const result = await updatePassword(formData);
        setLoading(false);

        if (result.success) {
            toast.success("Şifreniz başarıyla güncellendi.");
            formRef.current?.reset();
        } else {
            toast.error(result.error);
        }
    }

    return (
        <form ref={formRef} action={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                    <Input id="currentPassword" name="currentPassword" type="password" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="newPassword">Yeni Şifre</Label>
                    <Input id="newPassword" name="newPassword" type="password" required />
                </div>
            </div>
            <div className="flex justify-end">
                <Button variant="outline" type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Şifreyi Güncelle
                </Button>
            </div>
        </form>
    );
}
