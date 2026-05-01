"use client";

import { X, Sparkles, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

export function UpdateBanner() {
    const [isVisible, setIsVisible] = useState(false);

    // Bitiş tarihi: 28 Mart 2026 (Bugün 25 Mart + 3 gün)
    const expiryDate = new Date("2026-03-29T00:00:00Z").getTime();

    useEffect(() => {
        const now = new Date().getTime();
        const isDismissed = localStorage.getItem("admin-update-dismissed");
        
        if (now < expiryDate && !isDismissed) {
            setIsVisible(true);
        }
    }, []);

    const dismiss = () => {
        setIsVisible(false);
        localStorage.setItem("admin-update-dismissed", "true");
    };

    if (!isVisible) return null;

    return (
        <div className="relative isolate flex items-center gap-x-6 overflow-hidden bg-gray-50 dark:bg-gray-800/50 px-6 py-2.5 sm:px-3.5 sm:before:flex-1 border-b border-gray-100 dark:border-gray-800 animate-in slide-in-from-top duration-500">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="text-sm leading-6 text-gray-900 dark:text-gray-100">
                    <strong className="font-bold flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        Yeni Güncelleme
                    </strong>
                    <svg viewBox="0 0 2 2" className="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true">
                        <circle cx="1" cy="1" r="1" />
                    </svg>
                    Google Merchant Center Entegrasyonu ve Havale/EFT Bildirim Modülü başarıyla tamamlandı!
                </p>
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/integrations/google"
                        className="flex-none rounded-full bg-gray-900 dark:bg-white px-3.5 py-1 text-sm font-semibold text-white dark:text-gray-900 shadow-sm hover:bg-gray-700 dark:hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                    >
                        Merchant panelini gör <span aria-hidden="true">&rarr;</span>
                    </Link>
                    <Link
                        href="/admin/bank-transfers"
                        className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 flex items-center gap-1 hover:underline"
                    >
                        Havale Bildirimleri <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
            </div>
            <div className="flex flex-1 justify-end">
                <button type="button" onClick={dismiss} className="-m-3 p-3 focus-visible:outline-offset-[-4px]">
                    <span className="sr-only">Kapat</span>
                    <X className="h-5 w-5 text-gray-900 dark:text-gray-100" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
