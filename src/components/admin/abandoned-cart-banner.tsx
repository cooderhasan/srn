"use client";

import { X, ShoppingCart, Mail, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

export function AbandonedCartBanner() {
    const [isVisible, setIsVisible] = useState(false);

    // Bitiş tarihi: 2 gün sonra (9 Nisan 2026)
    const expiryDate = new Date("2026-04-09T23:59:59Z").getTime();

    useEffect(() => {
        const now = new Date().getTime();
        const isDismissed = localStorage.getItem("admin-abandoned-cart-banner-dismissed");
        
        if (now < expiryDate && !isDismissed) {
            setIsVisible(true);
        }
    }, [expiryDate]);

    const dismiss = () => {
        setIsVisible(false);
        localStorage.setItem("admin-abandoned-cart-banner-dismissed", "true");
    };

    if (!isVisible) return null;

    return (
        <div className="relative isolate flex items-center gap-x-6 overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 px-6 py-2.5 sm:px-3.5 sm:before:flex-1 border-b border-emerald-500/20 animate-in slide-in-from-top duration-700">
            {/* Background pattern decor */}
            <div className="absolute left-[max(-7rem,calc(50%-52rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl" aria-hidden="true">
                <div className="aspect-[577/310] w-[36.0625rem] bg-gradient-to-r from-[#80ffb5] to-[#89fcae] opacity-20" style={{ clipPath: 'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 52.8% 34.2%, 74.8% 41.9%)' }}></div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2 text-white">
                    <div className="bg-white/20 p-1 rounded-lg backdrop-blur-sm animate-bounce">
                        <ShoppingCart className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-sm leading-6">
                        <strong className="font-bold">Yeni Özellik: Sepette Bekleyenler!</strong>
                        <svg viewBox="0 0 2 2" className="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true">
                            <circle cx="1" cy="1" r="1" />
                        </svg>
                        Müşterilerinize doğrudan sepetlerini hatırlatacak e-postalar göndererek satışlarınızı artırın.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/reports/abandoned-carts"
                        className="flex-none rounded-full bg-white px-3.5 py-1 text-xs font-bold text-teal-700 shadow-sm hover:bg-teal-50 transition-colors flex items-center gap-1"
                    >
                        <Mail className="h-3 w-3" /> Sistemi İncele <span aria-hidden="true">&rarr;</span>
                    </Link>
                </div>
            </div>
            <div className="flex flex-1 justify-end">
                <button type="button" onClick={dismiss} className="-m-3 p-3 focus-visible:outline-offset-[-4px] hover:scale-110 transition-transform">
                    <span className="sr-only">Kapat</span>
                    <X className="h-5 w-5 text-white/80 hover:text-white" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
