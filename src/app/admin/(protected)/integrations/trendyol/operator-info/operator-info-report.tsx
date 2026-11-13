"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOperatorReportAction, startOperatorReportAction } from "./actions";
import { OperatorSendPanel } from "./operator-send-panel";
import type { OperatorReport, OperatorReportBrand, OperatorReportRow } from "@/lib/trendyol-operator-report";

const FIELD_LABELS: Record<string, string> = {
    mName: "Üretici adı", mAddress: "Üretici adres", mMail: "Üretici mail",
    iName: "İthalatçı adı", iAddress: "İthalatçı adres", iMail: "İthalatçı mail",
};

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }) : "-");

/** Excel Türkçe karakterleri doğru açsın diye BOM; ayraç noktalı virgül (Türkçe Excel) */
function downloadCsv(fileName: string, head: string[], lines: string[][]) {
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const text = [head, ...lines].map((l) => l.map(esc).join(";")).join("\r\n");
    const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

const downloadRows = (rows: OperatorReportRow[]) =>
    downloadCsv(
        "trendyol-uretici-ithalatci-eksik",
        ["Durum", "Marka", "Trendyol'daki marka", "Bizde ürün", "Ürün adı", "Model kodu", "Barkodlar", "Satışta", "Dolu alanlar", "Menşei", "Content ID"],
        rows.map((r) => [
            r.status === "EMPTY" ? "Boş" : r.status === "PARTIAL" ? "Eksik" : "Tam",
            r.brand,
            r.trendyolBrand || r.brand,
            r.matched === false ? "Yok" : "Var",
            r.title,
            r.productMainId,
            r.barcodes.join(" "),
            r.onSale ? "Evet" : "Hayır",
            r.filled.map((f) => FIELD_LABELS[f] || f).join(", "),
            r.originMissing ? (r.originSource ? `Boş (doldurulabilir: ${r.originSource})` : "Boş") : "Dolu",
            String(r.contentId),
        ])
    );

const firmText = (b: OperatorReportBrand) =>
    b.firmDefined === true ? "Tanımlı"
        : b.firmDefined === false ? "Firma tanımsız"
            : b.kind === "NO_BRAND" ? "Ürüne marka seçilmemiş"
                : "Ürün ve marka bizde yok";

const FirmBadge = ({ b }: { b: OperatorReportBrand }) =>
    b.firmDefined === true ? <Badge className="border-none bg-green-100 text-green-700 hover:bg-green-100">Tanımlı</Badge>
        : b.firmDefined === false ? <Badge variant="outline" className="border-amber-200 text-amber-600">Firma tanımsız</Badge>
            : b.kind === "NO_BRAND" ? <Badge variant="outline" className="border-amber-200 text-amber-600">Ürüne marka seçilmemiş</Badge>
                : <Badge variant="outline" className="border-red-200 text-red-500">{b.kind ? "Ürün ve marka bizde yok" : "Marka bizde yok"}</Badge>;

const downloadBrands = (brands: OperatorReportBrand[]) =>
    downloadCsv(
        "trendyol-marka-firma-durumu",
        ["Marka", "Bizde", "İlan", "Tam", "Eksik", "Boş"],
        brands.map((b) => [b.brand, firmText(b), String(b.total), String(b.full), String(b.partial), String(b.empty)])
    );

export function OperatorInfoReport() {
    const [report, setReport] = useState<OperatorReport | null>(null);
    const [starting, setStarting] = useState(false);
    const [brandFilter, setBrandFilter] = useState<string | null>(null);
    const [onlyProblemBrands, setOnlyProblemBrands] = useState(false);
    // Varsayılan: sadece satıştaki ilanlar (önce bunlar tamamlanacak)
    const [onlyOnSale, setOnlyOnSale] = useState(true);
    // Liste: üretici/ithalatçı eksik-boş ilanlar ya da Menşei boş ilanlar
    const [listMode, setListMode] = useState<"operator" | "origin">("operator");

    const load = useCallback(async () => {
        try {
            setReport(await getOperatorReportAction());
        } catch {
            toast.error("Rapor okunamadı.");
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Hazırlanırken 3 sn'de bir ilerlemeyi oku
    useEffect(() => {
        if (!report?.running) return;
        const timer = setInterval(load, 3000);
        return () => clearInterval(timer);
    }, [report?.running, load]);

    const start = async () => {
        setStarting(true);
        try {
            const res = await startOperatorReportAction();
            if (res.started) toast.success("Rapor hazırlanıyor; Trendyol'daki tüm ilanlar okunuyor.");
            else toast.info(res.message);
            await load();
        } catch {
            toast.error("Rapor başlatılamadı.");
        }
        setStarting(false);
    };

    const rows = useMemo(
        () => (report?.rows || []).filter((r) =>
            (!brandFilter || r.brand === brandFilter) && (!onlyOnSale || r.onSale)
            && (listMode === "origin" ? !!r.originMissing : r.status !== "FULL")),
        [report?.rows, brandFilter, onlyOnSale, listMode]
    );
    // Satıştaki sayılar eski raporda yoksa eksik/boş ilan listesinden hesaplanır (Tam sayısı o zaman bilinmez)
    const allBrands = useMemo(() => {
        const list = report?.brands || [];
        if (!onlyOnSale) return list;
        return list
            .map((b) => {
                if (b.onSale) return { ...b, ...b.onSale };
                const mine = (report?.rows || []).filter((r) => r.brand === b.brand && r.onSale);
                const partial = mine.filter((r) => r.status === "PARTIAL").length;
                const empty = mine.length - partial;
                return { ...b, total: partial + empty, full: 0, partial, empty };
            })
            .filter((b) => b.total > 0)
            .sort((a, b) => (b.partial + b.empty) - (a.partial + a.empty) || b.total - a.total);
    }, [report?.brands, report?.rows, onlyOnSale]);
    const missingBrands = allBrands.filter((b) => b.firmDefined === null).length;
    const notFoundListings = allBrands.filter((b) => b.kind === "NOT_FOUND").reduce((sum, b) => sum + b.partial + b.empty, 0);
    const noFirmBrands = allBrands.filter((b) => b.firmDefined === false).length;
    const brands = onlyProblemBrands ? allBrands.filter((b) => b.firmDefined !== true) : allBrands;

    const t = report?.totals;
    const soldRows = (report?.rows || []).filter((r) => r.onSale);
    const cards = t && (onlyOnSale
        ? {
            total: t.onSale,
            full: report?.onSaleTotals?.full ?? t.onSale - soldRows.length,
            partial: report?.onSaleTotals?.partial ?? soldRows.filter((r) => r.status === "PARTIAL").length,
            empty: report?.onSaleTotals?.empty ?? soldRows.filter((r) => r.status === "EMPTY").length,
        }
        : { total: t.contents, full: t.full, partial: t.partial, empty: t.empty });
    const p = report?.progress;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <Link href="/admin/integrations/trendyol" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
                        <ArrowLeft className="h-4 w-4" /> Trendyol
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Üretici / İthalatçı Bilgisi Raporu</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Trendyol&apos;daki onaylı ilanlarda ürün güvenliği bilgilerinin girilip girilmediğini ve ilanların markasının bizde tanımlı olup olmadığını gösterir.
                        Sadece okur, Trendyol&apos;da hiçbir şeyi değiştirmez. Arşivlenmiş ilanlar sayılmaz.
                    </p>
                </div>
                <Button onClick={start} disabled={starting || !!report?.running} className="gap-2 bg-orange-600 text-white hover:bg-orange-700">
                    {report?.running || starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {report?.finishedAt ? "Raporu Yenile" : "Raporu Hazırla"}
                </Button>
            </div>

            {report?.running && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300">
                    Trendyol&apos;daki ilanlar okunuyor{p?.totalPages ? `: sayfa ${p.page} / ${p.totalPages}` : "..."}. Birkaç dakika sürebilir; sayfadan çıkabilirsiniz, rapor arka planda hazırlanır.
                </div>
            )}

            {report?.error && !report.running && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{report.error}</div>
            )}

            {!report?.running && !t && !report?.error && (
                <div className="rounded-xl border bg-white p-10 text-center text-sm text-gray-500 dark:bg-gray-900">
                    <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    Henüz rapor hazırlanmadı. &quot;Raporu Hazırla&quot; ile başlatın.
                </div>
            )}

            {t && !report?.running && (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant={onlyOnSale ? "default" : "outline"} onClick={() => setOnlyOnSale(true)}>
                            Sadece satıştakiler ({t.onSale.toLocaleString("tr-TR")})
                        </Button>
                        <Button size="sm" variant={!onlyOnSale ? "default" : "outline"} onClick={() => setOnlyOnSale(false)}>
                            Tüm ilanlar ({t.contents.toLocaleString("tr-TR")})
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {[
                            { label: onlyOnSale ? "Satıştaki ilan" : "Toplam ilan", value: cards!.total, sub: onlyOnSale ? `toplam ${t.contents.toLocaleString("tr-TR")} ilandan` : `${t.onSale.toLocaleString("tr-TR")} satışta`, cls: "text-gray-900 dark:text-white" },
                            { label: "Tam", value: cards!.full, sub: "üretici ya da ithalatçı eksiksiz", cls: "text-green-600" },
                            { label: "Eksik", value: cards!.partial, sub: "bazı alanlar boş", cls: "text-amber-600" },
                            { label: "Boş", value: cards!.empty, sub: "hiç girilmemiş", cls: "text-red-600" },
                        ].map((c) => (
                            <div key={c.label} className="rounded-xl border bg-white p-4 dark:bg-gray-900">
                                <p className="text-xs font-medium text-gray-500">{c.label}</p>
                                <p className={`mt-1 text-2xl font-bold ${c.cls}`}>{c.value.toLocaleString("tr-TR")}</p>
                                <p className="text-xs text-gray-400">{c.sub}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400">Son rapor: {fmtDate(report?.finishedAt)}</p>

                    {report?.originMissing && report.originMissing.all > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                            <b>{report.originMissing.all.toLocaleString("tr-TR")} ilanda Menşei boş</b> ({report.originMissing.onSale.toLocaleString("tr-TR")} tanesi satışta).
                            Menşei boş ilanda Trendyol güncellemeyi &quot;Zorunlu Ürün Özelliği Eksik&quot; diye reddediyor.{" "}
                            {report.originMissing.withSource > 0
                                ? `${report.originMissing.withSource.toLocaleString("tr-TR")} tanesi gönderimde otomatik doldurulur: önce Trendyol varyant kodu ya da ürün kartının Menşei alanı, yoksa markanın firmasına göre (ithalatçı → CN, sadece imalatçı → TR).`
                                : "Hiçbirinde menşei bilgisi elimizde yok."}{" "}
                            Aşağıdaki listede &quot;Menşei boş&quot; seçilip Excel&apos;e indirilebilir.
                        </div>
                    )}

                    <OperatorSendPanel />

                    <div className="rounded-xl border bg-white dark:bg-gray-900">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
                            <div className="min-w-0 flex-1">
                                <h2 className="font-semibold">Markalara göre ({allBrands.length})</h2>
                                <p className="text-xs text-gray-500">
                                    İlanlar barkod / stok koduyla bizdeki ürüne eşleştirilir, marka bizdeki üründen alınır (Trendyol ilanın markasını sonradan değiştirebiliyor); ürün bizde yoksa Trendyol markasının adıyla bizdeki markaya bağlanır.{" "}
                                    {onlyOnSale ? "Satıştaki ilanlarda " : ""}<span className="font-medium text-gray-700 dark:text-gray-300">{noFirmBrands} markada firma tanımsız</span>
                                    {missingBrands > 0 && <>, <span className="font-medium text-gray-700 dark:text-gray-300">{notFoundListings.toLocaleString("tr-TR")} eksik/boş ilanın ne ürünü ne markası bizde bulundu</span> (Trendyol markasına göre gruplandı)</>}.
                                    Firma tanımsız markalar Markalar sayfasından tamamlanır. Satıra tıklayınca aşağıdaki liste o markaya süzülür.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => setOnlyProblemBrands((v) => !v)}>
                                    {onlyProblemBrands ? "Tüm markalar" : "Sadece eksik markalar"}
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadBrands(brands)}>
                                    <Download className="h-4 w-4" /> Excel&apos;e indir
                                </Button>
                            </div>
                        </div>
                        <div className="max-h-[420px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Marka</TableHead>
                                        <TableHead>Bizde</TableHead>
                                        <TableHead className="text-right">İlan</TableHead>
                                        <TableHead className="text-right">Tam</TableHead>
                                        <TableHead className="text-right">Eksik</TableHead>
                                        <TableHead className="text-right">Boş</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {brands.map((b) => (
                                        <TableRow
                                            key={`${b.kind || ""}|${b.brand}`}
                                            className={`cursor-pointer ${brandFilter === b.brand ? "bg-orange-50 dark:bg-orange-950/20" : ""}`}
                                            onClick={() => setBrandFilter(brandFilter === b.brand ? null : b.brand)}
                                        >
                                            <TableCell className="font-medium">{b.brand}</TableCell>
                                            <TableCell>
                                                <FirmBadge b={b} />
                                            </TableCell>
                                            <TableCell className="text-right">{b.total}</TableCell>
                                            <TableCell className="text-right text-green-600">{b.full || ""}</TableCell>
                                            <TableCell className="text-right text-amber-600">{b.partial || ""}</TableCell>
                                            <TableCell className="text-right text-red-600">{b.empty || ""}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-white dark:bg-gray-900">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                            <div className="min-w-0">
                                <h2 className="font-semibold">
                                    {listMode === "origin" ? "Menşei boş ilanlar" : "Eksik ve boş ilanlar"}{brandFilter ? ` · ${brandFilter}` : ""} ({rows.length.toLocaleString("tr-TR")})
                                </h2>
                                <div className="mt-1 flex gap-2">
                                    <Button size="sm" variant={listMode === "operator" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setListMode("operator")}>Üretici/ithalatçı eksik</Button>
                                    <Button size="sm" variant={listMode === "origin" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setListMode("origin")}>Menşei boş</Button>
                                </div>
                                {brandFilter && (
                                    <button type="button" className="text-xs text-orange-600 hover:underline" onClick={() => setBrandFilter(null)}>Marka süzgecini kaldır</button>
                                )}
                            </div>
                            <Button variant="outline" size="sm" className="gap-2" disabled={rows.length === 0} onClick={() => downloadRows(rows)}>
                                <Download className="h-4 w-4" /> Excel&apos;e indir
                            </Button>
                        </div>
                        <div className="max-h-[600px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Durum</TableHead>
                                        <TableHead>Ürün</TableHead>
                                        <TableHead>Marka</TableHead>
                                        <TableHead>Dolu alanlar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.slice(0, 300).map((r) => (
                                        <TableRow key={r.contentId}>
                                            <TableCell>
                                                {r.status === "EMPTY"
                                                    ? <Badge variant="outline" className="border-red-200 text-red-500">Boş</Badge>
                                                    : r.status === "PARTIAL"
                                                        ? <Badge variant="outline" className="border-amber-200 text-amber-600">Eksik</Badge>
                                                        : <Badge className="border-none bg-green-100 text-green-700 hover:bg-green-100">Tam</Badge>}
                                                {r.originMissing && (
                                                    <p className="mt-1 text-[11px] text-amber-600">Menşei boş{r.originSource ? ` (var: ${r.originSource})` : ""}</p>
                                                )}
                                            </TableCell>
                                            <TableCell className="min-w-[260px] whitespace-normal">
                                                <p className="line-clamp-2 text-sm font-medium" title={r.title}>{r.title}</p>
                                                <p className="font-mono text-xs text-gray-500">
                                                    {r.barcodes.slice(0, 3).join(", ")}{r.barcodes.length > 3 ? ` +${r.barcodes.length - 3}` : ""}{r.onSale ? "" : " · satışta değil"}
                                                </p>
                                            </TableCell>
                                            <TableCell className="whitespace-normal">
                                                {r.brand}
                                                {r.trendyolBrand && r.trendyolBrand !== r.brand && r.matched !== false && (
                                                    <p className="text-xs text-gray-400">Trendyol&apos;da: {r.trendyolBrand}</p>
                                                )}
                                                {r.matched === false && <p className="text-xs text-red-400">ürün bizde yok{r.trendyolBrand && r.trendyolBrand !== r.brand ? ` (Trendyol'da: ${r.trendyolBrand})` : ""}</p>}
                                            </TableCell>
                                            <TableCell className="whitespace-normal text-xs text-gray-500">
                                                {r.filled.length ? r.filled.map((f) => FIELD_LABELS[f] || f).join(", ") : "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {rows.length > 300 && (
                                <p className="p-4 text-center text-xs text-gray-500">İlk 300 ilan gösteriliyor; tamamı için Excel&apos;e indirin.</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
