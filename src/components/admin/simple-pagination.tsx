"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Tarayıcıdaki liste için sayfalama: "1-25 / 80" bilgisi + ‹ 1 … 4 5 6 … 9 › butonları. Tek sayfa varsa görünmez. */
export function SimplePagination({
    page,
    pageSize,
    total,
    onPageChange,
}: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
}) {
    const pageCount = Math.ceil(total / pageSize);
    if (pageCount <= 1) return null;

    const pages: (number | "…")[] = [];
    for (let p = 1; p <= pageCount; p++) {
        if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) pages.push(p);
        else if (pages[pages.length - 1] !== "…") pages.push("…");
    }

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-3">
            <span className="text-sm text-gray-500">
                {from}-{to} / {total}
            </span>
            <div className="flex flex-wrap items-center gap-1">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Önceki sayfa">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                {pages.map((p, i) =>
                    p === "…" ? (
                        <span key={`gap-${i}`} className="px-1 text-sm text-gray-400">…</span>
                    ) : (
                        <Button key={p} size="sm" variant={p === page ? "default" : "outline"} className="min-w-9" onClick={() => onPageChange(p)}>
                            {p}
                        </Button>
                    )
                )}
                <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label="Sonraki sayfa">
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
