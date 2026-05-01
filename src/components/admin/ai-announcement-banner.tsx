"use client";

import { X, Sparkles, Brain, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

export function AiAnnouncementBanner() {
    const [isVisible, setIsVisible] = useState(false);

    // Bitiş tarihi: 9 Nisan 2026 (Bugün 6 Nisan + 3 gün)
    const expiryDate = new Date("2026-04-09T23:59:59Z").getTime();

    useEffect(() => {
        const now = new Date().getTime();
        const isDismissed = localStorage.getItem("admin-ai-announcement-dismissed");
        
        if (now < expiryDate && !isDismissed) {
            setIsVisible(true);
        }
    }, [expiryDate]);

    const dismiss = () => {
        setIsVisible(false);
        localStorage.setItem("admin-ai-announcement-dismissed", "true");
    };

    if (!isVisible) return null;

    return (
        <div className="relative isolate flex items-center gap-x-6 overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-2.5 sm:px-3.5 sm:before:flex-1 border-b border-indigo-500/20 animate-in slide-in-from-top duration-700">
            {/* Background pattern decor */}
            <div className="absolute left-[max(-7rem,calc(50%-52rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl" aria-hidden="true">
                <div className="aspect-[577/310] w-[36.0625rem] bg-gradient-to-r from-[#ff80b5] to-[#9089fc] opacity-30" style={{ clipPath: 'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 52.8% 34.2%, 74.8% 41.9%)' }}></div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2 text-white">
                    <div className="bg-white/20 p-1 rounded-lg backdrop-blur-sm animate-pulse">
                        <Brain className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-sm leading-6">
                        <strong className="font-bold">Yeni Nesil AI Özelliği Geldi!</strong>
                        <svg viewBox="0 0 2 2" className="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true">
                            <circle cx="1" cy="1" r="1" />
                        </svg>
                        Google Gemini AI ile saniyeler içinde SEO uyumlu ve özgün ürün açıklamaları oluşturun.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/integrations/gemini"
                        className="flex-none rounded-full bg-white px-3.5 py-1 text-xs font-bold text-indigo-600 shadow-sm hover:bg-indigo-50 transition-colors"
                    >
                        Hemen Dene <span aria-hidden="true">&rarr;</span>
                    </Link>
                    <Link
                        href="/admin/products/new"
                        className="text-xs font-semibold leading-6 text-indigo-100 flex items-center gap-1 hover:text-white transition-colors"
                    >
                        Ürün Ekle <ArrowRight className="h-3 w-3" />
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
