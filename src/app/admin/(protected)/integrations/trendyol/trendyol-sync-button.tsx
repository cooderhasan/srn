
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Loader2 } from "lucide-react";
import { syncProductsToTrendyol } from "./actions";
import { toast } from "sonner";

export function TrendyolSyncButton() {
    const [loading, setLoading] = useState(false);

    async function handleSync() {
        setLoading(true);
        try {
            const result = await syncProductsToTrendyol();
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manuel Eşitleme</CardTitle>
                <CardDescription>
                    Tüm ürünlerin fiyat ve stok bilgilerini Trendyol'a anlık olarak gönderir.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button
                    onClick={handleSync}
                    disabled={loading}
                    className="w-full"
                >
                    {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {loading ? "Eşitleniyor..." : "Ürünleri Trendyol'a Gönder (Sync)"}
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                    Not: Sadece barkodu olan ve aktif ürünler gönderilir.
                </p>
            </CardContent>
        </Card>
    );
}
