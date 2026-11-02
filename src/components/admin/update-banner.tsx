"use client";

import { X, Sparkles, ChevronDown, ReceiptText, RefreshCw, Boxes, LayoutDashboard, Store } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * 2 Kasım 2026 güncellemelerini anlatan bilgi barı. 3 gün sonra kendiliğinden kaybolur (5 Kasım 00:00, Türkiye);
 * X ile kapatılınca bu tarayıcıda bir daha görünmez. Yeni bir duyuruda DISMISS_KEY değiştirilmeli (eski kapatma
 * kaydı yeni duyuruyu gizlemesin).
 */
const EXPIRES_AT = new Date("2026-11-05T00:00:00+03:00").getTime();
const DISMISS_KEY = "admin-update-2026-11-02-dismissed";

const items = [
    {
        icon: ReceiptText,
        title: "Otomatik e-fatura (N11 ve Hepsiburada)",
        text: "3 Kasım'dan itibaren gelen N11 ve Hepsiburada siparişleri Kargolandı olunca faturası Trendyol e-Faturam ile otomatik kesilir, linki pazaryerine iletilir. Faturalar tek tek, 7 sn arayla gider. Trendyol faturalarını Trendyol kesmeye devam ediyor. Hata olan sipariş \"Fatura: Hatalı\" filtresinde görünür, oradan elle kesilebilir.",
    },
    {
        icon: RefreshCw,
        title: "Sipariş durumları pazaryerinden güncelleniyor",
        text: "Trendyol, N11 ve Hepsiburada'da kargolanan, teslim edilen veya iptal edilen siparişlerin durumu her saat başı otomatik güncellenir. Beklemek istemezseniz pazaryeri sayfasındaki \"Siparişleri Çek\" düğmesine basın.",
    },
    {
        icon: Boxes,
        title: "Stok düşme ve iade düzeltildi",
        text: "Varyantlı ürünlerde ana stok artık varyantların toplamı; paket ürünlerde alt ürünler düşer. Toplu iptalde de stok geri eklenir. Sitede bulunamayan pazaryeri ürünü siparişi kaybettirmez: \"Tanımsız Ürün\" olarak gelir, notunda uyarı yazar, stoğu düşülmez.",
    },
    {
        icon: LayoutDashboard,
        title: "Yeni yönetim paneli görünümü",
        text: "Yeni sol menü, Genel Bakış'ta pazaryeri satış grafikleri ve kargolanacak siparişler, Raporlar'da pazaryeri kırılımı, sipariş listesinin altında toplam tutarlar. Panel telefonda da rahat kullanılır.",
    },
    {
        icon: Store,
        title: "Mağaza görünümü yenilendi",
        text: "Yeni ürün kartları ve renkler, ana sayfada bantlı bölümler, sade üst kısım (boş sepette ₺0 yazmaz), telefonda alttan açılan \"Sepetinize eklendi\" penceresi.",
    },
];

export function UpdateBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        let dismissed = false;
        try {
            dismissed = localStorage.getItem(DISMISS_KEY) === "1";
        } catch { }
        if (Date.now() < EXPIRES_AT && !dismissed) setIsVisible(true);
    }, []);

    const dismiss = () => {
        setIsVisible(false);
        try {
            localStorage.setItem(DISMISS_KEY, "1");
        } catch { }
    };

    if (!isVisible) return null;

    return (
        <div className="border-b border-primary/15 bg-primary/[0.06] dark:bg-sky-950/30 print:hidden animate-in slide-in-from-top duration-500">
            <div className="flex items-start gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-sm text-gray-800 dark:text-gray-100">
                            <strong className="font-semibold">Yeni güncelleme:</strong>{" "}
                            N11 ve Hepsiburada faturaları artık kargolanınca otomatik kesiliyor; sipariş durumları ve stoklar pazaryerleriyle düzgün eşitleniyor.
                        </p>
                        <button
                            type="button"
                            onClick={() => setExpanded((v) => !v)}
                            aria-expanded={expanded}
                            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
                        >
                            {expanded ? "Gizle" : "Detaylar"}
                            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
                        </button>
                    </div>

                    {expanded && (
                        <div className="mt-3 mb-1 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {items.map(({ icon: Icon, title, text }) => (
                                <div key={title} className="flex gap-2.5 rounded-lg bg-white/80 dark:bg-gray-900/60 p-3 ring-1 ring-primary/10">
                                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">{text}</p>
                                    </div>
                                </div>
                            ))}
                            <p className="text-xs text-gray-500 md:col-span-2">
                                Faturası kesilemeyen siparişler için:{" "}
                                <Link href="/admin/orders?invoice=ERROR" className="font-semibold text-primary hover:underline">
                                    Fatura hatalı siparişler →
                                </Link>
                            </p>
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Bilgi barını kapat"
                    title="Kapat"
                    className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-primary/10 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
