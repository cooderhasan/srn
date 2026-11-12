"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { switchOrderToCardPayment } from "@/app/(storefront)/orders/actions";

/** Havale siparişini karta çevirip PayTR ödeme ekranına götürür (havale indirimi kaldırılır) */
export function PayByCardButton({ orderId, amountLabel }: { orderId: string; amountLabel: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        if (!confirm(`Siparişiniz kredi kartı ödemesine çevrilecek. Ödenecek tutar: ${amountLabel}. Devam edilsin mi?`)) return;
        setLoading(true);
        try {
            const res = await switchOrderToCardPayment(orderId);
            if (!res.success) {
                toast.error(res.error || "İşlem yapılamadı.");
                setLoading(false);
                return;
            }
            router.push(`/payment/paytr/${orderId}`);
        } catch {
            toast.error("İşlem yapılamadı. Lütfen tekrar deneyin.");
            setLoading(false);
        }
    };

    return (
        <Button onClick={handleClick} disabled={loading} className="bg-[#009AD0] hover:bg-[#0081AF] shrink-0">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
            Kartla Öde · {amountLabel}
        </Button>
    );
}
