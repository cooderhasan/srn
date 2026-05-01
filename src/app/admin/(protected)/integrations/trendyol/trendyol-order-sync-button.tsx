
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Download } from "lucide-react";
import { syncOrdersFromTrendyol } from "./actions";

export function TrendyolOrderSyncButton() {
    const [loading, setLoading] = useState(false);

    const handleSync = async () => {
        setLoading(true);
        try {
            const res = await syncOrdersFromTrendyol();
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 mt-6">
            <h3 className="font-semibold leading-none tracking-tight mb-4">Sipariş Entegrasyonu</h3>
            <p className="text-sm text-muted-foreground mb-4">
                Trendyol'dan yeni siparişleri çekerek sisteme kaydeder.
            </p>
            <Button onClick={handleSync} disabled={loading} variant="outline" className="w-full">
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Siparişler Çekiliyor...
                    </>
                ) : (
                    <>
                        <Download className="mr-2 h-4 w-4" />
                        Siparişleri Çek
                    </>
                )}
            </Button>
        </div>
    );
}
