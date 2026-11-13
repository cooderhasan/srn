"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FlaskConical, Loader2, RefreshCw, Send, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkSendResultsAction, getSendStateAction, startOperatorSendAction } from "./actions";
import type { SendState, SentItem } from "@/lib/trendyol-operator-send";

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }) : "-");

const ResultBadge = ({ it }: { it: SentItem }) =>
    it.result === "SUCCESS" ? <Badge className="border-none bg-green-100 text-green-700 hover:bg-green-100">Onaylandı</Badge>
        : it.result === "FAIL" ? <Badge variant="outline" className="border-red-200 text-red-600">Reddedildi</Badge>
            : it.batchRequestId ? <Badge variant="outline" className="text-gray-500">Kontrol bekliyor</Badge>
                : <Badge variant="outline" className="text-gray-400">Gönderilmedi (deneme)</Badge>;

/** Trendyol'a üretici / ithalatçı bilgisi gönderme: önce deneme raporu, sonra birkaç ilan, sonra hepsi */
export function OperatorSendPanel() {
    const [state, setState] = useState<SendState | null>(null);
    const [busy, setBusy] = useState(false);
    // Kapsam: sadece satıştakiler ya da satışa kapalılar (tükenmiş vb.) dahil tümü
    const [includeClosed, setIncludeClosed] = useState(false);

    const load = useCallback(async () => {
        try { setState(await getSendStateAction()); } catch { /* sayfa yine açılır */ }
    }, []);
    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (!state?.running) return;
        const t = setInterval(load, 3000);
        return () => clearInterval(t);
    }, [state?.running, load]);

    const start = async (mode: "dry" | "test" | "all", limit?: number) => {
        const scope = includeClosed ? "Satıştaki ve satışa kapalı (tükenmiş dahil)" : "Satıştaki";
        if (mode === "test" && !window.confirm(`${scope} eksik/boş ilanlardan ${limit} tanesine üretici/ithalatçı bilgisi GÖNDERİLECEK. Devam edilsin mi?`)) return;
        if (mode === "all" && !window.confirm(`${scope} TÜM eksik/boş ilanlara (firması tanımlı markalarda) üretici/ithalatçı bilgisi gönderilecek. Bu işlem Trendyol'daki ilanları değiştirir. Devam edilsin mi?`)) return;
        setBusy(true);
        try {
            const res = await startOperatorSendAction(mode, limit, !includeClosed);
            if (res.started) toast.success(res.message); else toast.info(res.message);
            await load();
        } catch {
            toast.error("İşlem başlatılamadı.");
        }
        setBusy(false);
    };

    const check = async () => {
        setBusy(true);
        try {
            const res = await checkSendResultsAction();
            toast.info(res.message);
            await load();
        } catch {
            toast.error("Sonuçlar okunamadı.");
        }
        setBusy(false);
    };

    const s = state?.summary;
    const items = state?.items || [];
    const sentItems = items.filter((i) => i.batchRequestId);
    const success = sentItems.filter((i) => i.result === "SUCCESS").length;
    const failed = sentItems.filter((i) => i.result === "FAIL").length;
    // Toplu gönderim ilk kez ancak başarılı bir denemeden sonra açılır; bir kez toplu gönderim yapıldıktan sonra hep açık kalır
    // (sonraki turlarda sonuç kontrolü beklenmez; kalanlar zor vakalar, red oranı yüksek olabilir).
    const testPassed = (state?.mode === "test" && success > 0 && failed === 0) || state?.mode === "all";
    const running = !!state?.running || busy;

    return (
        <div className="rounded-xl border border-orange-200 bg-white dark:border-orange-900/40 dark:bg-gray-900">
            <div className="border-b p-4">
                <h2 className="font-semibold">Trendyol&apos;a gönder</h2>
                <p className="mt-1 text-xs text-gray-500">
                    Eksik ve boş ilanlara, ilanın bizdeki ürününün markasına tanımlı imalatçı/ithalatçı bilgisi yazılır (ürün bizde yoksa Trendyol&apos;daki marka adıyla).
                    Tam ilanlara dokunulmaz. İlanın diğer özellikleri aynen korunur. Sıra: deneme raporu → birkaç ilanla deneme → sonuçları kontrol → hepsi.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
                <span className="text-xs font-medium text-gray-500">Kapsam:</span>
                <Button size="sm" variant={!includeClosed ? "default" : "outline"} disabled={running} onClick={() => setIncludeClosed(false)}>
                    Sadece satıştakiler
                </Button>
                <Button size="sm" variant={includeClosed ? "default" : "outline"} disabled={running} onClick={() => setIncludeClosed(true)}>
                    Satışa kapalılar dahil (tükenmiş ilanlar)
                </Button>
            </div>

            <div className="flex flex-wrap gap-2 p-4">
                <Button variant="outline" size="sm" className="gap-2" disabled={running} onClick={() => start("dry")}>
                    <SearchCheck className="h-4 w-4" /> 1. Deneme raporu (göndermez)
                </Button>
                <Button variant="outline" size="sm" className="gap-2 border-orange-300 text-orange-700" disabled={running} onClick={() => start("test", 6)}>
                    <FlaskConical className="h-4 w-4" /> 2. 6 ilanla dene
                </Button>
                <Button variant="outline" size="sm" className="gap-2" disabled={running || sentItems.length === 0} onClick={check}>
                    <RefreshCw className="h-4 w-4" /> 3. Sonuçları kontrol et
                </Button>
                <Button
                    size="sm"
                    className="gap-2 bg-orange-600 text-white hover:bg-orange-700"
                    disabled={running || !testPassed}
                    title={testPassed ? "" : "Önce birkaç ilanla deneyip sonuçları kontrol edin (hepsi onaylanmış olmalı)"}
                    onClick={() => start("all")}
                >
                    <Send className="h-4 w-4" /> 4. Hepsine gönder
                </Button>
            </div>

            {state?.running && (
                <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-950/30 dark:text-orange-300">
                    <Loader2 className="h-4 w-4 animate-spin" /> {state.progress || "Çalışıyor..."}
                </div>
            )}
            {state?.error && !state.running && (
                <div className="mx-4 mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
            )}

            {s && !state?.running && (
                <div className="space-y-3 px-4 pb-4 text-sm">
                    <p className="text-xs text-gray-400">
                        Son işlem: {state?.mode === "dry" ? "Deneme raporu" : state?.mode === "test" ? "Deneme gönderimi" : "Toplu gönderim"}
                        {state?.onlyOnSale === false ? " (satışa kapalılar dahil)" : " (sadece satıştakiler)"} · {fmtDate(state?.finishedAt)}
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <span>{state?.onlyOnSale === false ? "Eksik/boş (tümü)" : "Satışta eksik/boş"}: <b>{s.candidates.toLocaleString("tr-TR")}</b></span>
                        <span>Gönderilebilir: <b className="text-green-600">{s.ready.toLocaleString("tr-TR")}</b></span>
                        {state?.mode !== "dry" && <span>Gönderilen: <b>{s.sent.toLocaleString("tr-TR")}</b></span>}
                        {sentItems.length > 0 && <span>Onaylanan: <b className="text-green-600">{success}</b> · Reddedilen: <b className="text-red-600">{failed}</b></span>}
                    </div>
                    {Object.keys(s.skipped).length > 0 && (
                        <div className="text-xs text-gray-500">
                            Gönderilemeyenler:{" "}
                            {Object.entries(s.skipped).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v.toLocaleString("tr-TR")}`).join(" · ")}
                        </div>
                    )}
                    {s.notes && Object.keys(s.notes).length > 0 && (
                        <div className="text-xs text-gray-500">
                            Bilgi: {Object.entries(s.notes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v.toLocaleString("tr-TR")}`).join(" · ")}
                        </div>
                    )}
                    {s.warnings && Object.keys(s.warnings).length > 0 && (
                        <div className="text-xs text-amber-700">
                            Uyarı (gönderildi ama Trendyol reddedebilir):{" "}
                            {Object.entries(s.warnings).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v.toLocaleString("tr-TR")}`).join(" · ")}
                        </div>
                    )}
                    {s.batchErrors.length > 0 && (
                        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">Trendyol gönderimi reddetti: {s.batchErrors.join(" | ")}</div>
                    )}

                    {items.length > 0 && (
                        <div className="max-h-[420px] space-y-2 overflow-y-auto">
                            {items.slice(0, 200).map((it) => (
                                <div key={it.contentId} className="rounded-lg border p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="line-clamp-2 font-medium">{it.title}</p>
                                            <p className="text-xs text-gray-500">
                                                {it.brand}{it.trendyolBrand && it.trendyolBrand !== it.brand ? ` (Trendyol'da: ${it.trendyolBrand})` : ""} · önceden {it.previous === "EMPTY" ? "boş" : "eksik"}
                                                {it.productUrl && (
                                                    <> · <a href={it.productUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-orange-600 hover:underline">Trendyol&apos;da aç <ExternalLink className="h-3 w-3" /></a></>
                                                )}
                                            </p>
                                        </div>
                                        <ResultBadge it={it} />
                                    </div>
                                    <div className="mt-2 grid gap-x-4 gap-y-0.5 text-xs text-gray-600 sm:grid-cols-2">
                                        {Object.entries(it.values).map(([k, v]) => (
                                            <p key={k} className="break-words"><span className="text-gray-400">{k}:</span> {v}</p>
                                        ))}
                                    </div>
                                    {it.resultNote && <p className="mt-1 text-xs text-red-600">{it.resultNote}</p>}
                                </div>
                            ))}
                            {items.length > 200 && <p className="text-center text-xs text-gray-500">İlk 200 ilan gösteriliyor.</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
