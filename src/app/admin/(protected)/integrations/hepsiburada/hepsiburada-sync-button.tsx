
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { syncProductsToHepsiburada } from "./actions";

export function HepsiburadaSyncButton() {
    const [loading, setLoading] = useState(false);

    const handleSync = async () => {
        setLoading(true);
        try {
            const res = await syncProductsToHepsiburada();
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
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold leading-none tracking-tight mb-4">Ürün Eşitleme</h3>
            <p className="text-sm text-muted-foreground mb-4">
                Sistemdeki ürünleri Hepsiburada mağazanıza gönderin veya fiyat/stok güncelleyin.
            </p>
            <div className="space-y-4">
                <Button onClick={handleSync} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            İşleniyor...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Ürünleri Hepsiburada'ya Gönder
                        </>
                    )}
                </Button>
                <HBOrderSyncButton />
            </div>
        </div>
    );
}

import { syncOrdersFromHepsiburada } from "./actions";
import { Download } from "lucide-react";

function HBOrderSyncButton() {
    const [loading, setLoading] = useState(false);

    const handleOrderSync = async () => {
        setLoading(true);
        try {
            const res = await syncOrdersFromHepsiburada();
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
        <Button onClick={handleOrderSync} disabled={loading} variant="outline" className="w-full border-orange-200 text-orange-700 hover:bg-orange-50">
            {loading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Siparişler Çekiliyor...
                </>
            ) : (
                <>
                    <Download className="mr-2 h-4 w-4" />
                    Siparişleri Hepsiburada'dan Çek
                </>
            )}
        </Button>
    );
}
