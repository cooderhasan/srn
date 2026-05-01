"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { fixAllSlugs } from "@/app/admin/(protected)/products/actions";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export function FixSlugsButton() {
    const [loading, setLoading] = useState(false);

    const handleFix = async () => {
        if (!confirm("Tüm ürünlerin URL'leri (slug) kontrol edilecek ve bozuk olanlar düzeltilecektir. Bu işlem sadece adminler içindir. Onaylıyor musunuz?")) return;
        
        setLoading(true);
        try {
            const result = await fixAllSlugs();
            if (result.success) {
                toast.success(`${result.fixedCount} ürünün linki başarıyla düzeltildi!`);
            } else {
                toast.error(result.message || "Bir hata oluştu.");
            }
        } catch (error) {
            toast.error("İşlem sırasında beklenmeyen bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button onClick={handleFix} disabled={loading} variant="destructive">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Düzeltiliyor..." : "Bozuk Linkleri Onar"}
        </Button>
    );
}
