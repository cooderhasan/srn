import prisma from "@/lib/db";
import { operatorValueFor } from "@/lib/operator-fields";
import {
    defaultOriginFor, fieldOf, isOriginAttr, liveVariants, loadBrandResolver, operatorStatusOf, originInfoOf, scanApprovedContents, trendyolContext, trKey,
    type OperatorStatus, type ResolvedBrand,
} from "@/lib/trendyol-operator-report";

// Bizdeki Menşei yazımı -> ülke kodu (Trendyol değerleri "CN - (Çin)" biçiminde)
const COUNTRY_CODES: Record<string, string> = {
    turkiye: "TR", turkey: "TR", cin: "CN", china: "CN", tayvan: "TW", taiwan: "TW", italya: "IT", italy: "IT",
    almanya: "DE", germany: "DE", japonya: "JP", japan: "JP", hindistan: "IN", india: "IN", vietnam: "VN",
    tayland: "TH", thailand: "TH", "guney kore": "KR", kore: "KR", korea: "KR", abd: "US", usa: "US", amerika: "US",
    ingiltere: "GB", fransa: "FR", ispanya: "ES", endonezya: "ID", malezya: "MY", polonya: "PL", cekya: "CZ", "hong kong": "HK",
};

/** Menşei bilgisini (kod ya da ülke adı) Trendyol'un Menşei değerine eşler; bulamazsa null */
function matchOriginValue(source: string, values: { id: number; name: string }[]) {
    const raw = source.trim();
    const code = /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : COUNTRY_CODES[trKey(raw)];
    if (code) {
        const hit = values.find((v) => v.name.trim().toUpperCase() === code || v.name.trim().toUpperCase().startsWith(`${code} `));
        if (hit) return hit;
    }
    const want = trKey(raw);
    return values.find((v) => {
        const inParen = /\(([^)]+)\)/.exec(v.name)?.[1];
        return trKey(v.name) === want || (inParen && trKey(inParen) === want);
    }) || null;
}

/**
 * Trendyol'daki onaylı ilanlara ürün güvenliği (üretici / ithalatçı) bilgilerini toplu yazar.
 *
 * Kurallar (kullanıcıyla kararlaştırıldı, 2026-11-11):
 *  - Sadece Eksik ve Boş ilanlar; Tam olanlara (elle girilenler dahil) dokunulmaz.
 *  - Firma, ilanın bizdeki ürününün markasından (Trendyol'daki marka değil); ürün bizde yoksa Trendyol markasının adıyla.
 *  - Eksik ilanda mevcut birincil üretici / ithalatçı alanları silinip bizim firmanın bilgileri yazılır (ad + adres + mail birlikte).
 *  - Alanlar ilanın kategorisinde varsa yazılır (kategori özellik listesinden, adına göre).
 *  - Trendyol özellik güncellemede ilanın TÜM özelliklerinin gönderilmesini istiyor; eksik giden özellik silinebilir.
 *    Bu yüzden ilanın mevcut özellikleri aynen geri gönderilir, üzerine sadece bu alanlar eklenir.
 *  - Trendyol her güncellemeyi otomatik kontrol ediyor; sonuç update-audits ile okunur.
 */

const STATE_KEY = "trendyolOperatorSend";
const MAX_SENT_LOG = 3000;

export type SendMode = "dry" | "test" | "all";

export interface SentItem {
    contentId: number;
    title: string;
    brand: string;
    trendyolBrand: string;
    previous: OperatorStatus;
    /** Trendyol'daki ilan sayfası (kontrol için) */
    productUrl?: string;
    batchRequestId?: string;
    /** Gönderilen alanlar: özellik adı -> değer */
    values: Record<string, string>;
    /** Trendyol kontrol sonucu (Sonuçları Kontrol Et ile dolar) */
    result?: "SUCCESS" | "FAIL" | "PENDING";
    resultNote?: string;
}

export interface SendState {
    running: boolean;
    mode?: SendMode;
    /** false: satışa kapalı (tükenmiş vb.) ilanlar da dahil */
    onlyOnSale?: boolean;
    startedAt?: string;
    finishedAt?: string;
    error?: string;
    progress?: string;
    /** Son çalışmanın özeti */
    summary?: {
        candidates: number;
        ready: number;
        sent: number;
        skipped: Record<string, number>;
        /** Gönderildi ama reddedilebilir (ör. Menşei boş ve bilgimiz yok) */
        warnings?: Record<string, number>;
        /** Bilgi: ör. Menşei varsayılandan yazılan ilan sayısı */
        notes?: Record<string, number>;
        batches: string[];
        batchErrors: string[];
    };
    /** Son çalışmada gönderilen (ya da denemede gönderilecek) ilanlar */
    items?: SentItem[];
}

export async function getSendState(): Promise<SendState> {
    const row = await prisma.siteSettings.findUnique({ where: { key: STATE_KEY } });
    const state = ((row?.value as any) || { running: false }) as SendState;
    if (state.running && state.startedAt && Date.now() - new Date(state.startedAt).getTime() > 45 * 60 * 1000) {
        return { ...state, running: false, error: state.error || "İşlem yarıda kaldı (sunucu yeniden başlamış olabilir)." };
    }
    return state;
}

async function saveState(state: SendState) {
    await prisma.siteSettings.upsert({
        where: { key: STATE_KEY },
        update: { value: state as any },
        create: { key: STATE_KEY, value: state as any },
    });
}

export async function startOperatorSend(opts: { mode: SendMode; limit?: number; onlyOnSale?: boolean }): Promise<{ started: boolean; message: string }> {
    const current = await getSendState();
    if (current.running) return { started: false, message: "Önceki işlem hâlâ sürüyor." };
    const startedAt = new Date().toISOString();
    await saveState({ ...current, running: true, mode: opts.mode, onlyOnSale: opts.onlyOnSale !== false, startedAt, error: undefined, progress: "Trendyol ilanları okunuyor..." });

    void runOperatorSend(startedAt, opts).catch(async (e) => {
        console.error("Trendyol ürün güvenliği gönderim hatası:", e);
        const last = await getSendState();
        await saveState({ ...last, running: false, finishedAt: new Date().toISOString(), error: e?.message || String(e) });
    });
    return { started: true, message: opts.mode === "dry" ? "Deneme raporu hazırlanıyor." : "Gönderim başladı." };
}

/** İlanın mevcut içerik özelliklerini Trendyol'un güncelleme biçimine çevirir (çoklu değerler birleştirilir) */
function currentAttributesPayload(attributes: any[], drop: Set<number>) {
    const grouped = new Map<number, any[]>();
    for (const a of Array.isArray(attributes) ? attributes : []) {
        const id = Number(a.attributeId);
        if (!id || drop.has(id)) continue;
        grouped.set(id, [...(grouped.get(id) || []), a]);
    }
    const out: any[] = [];
    for (const [attributeId, list] of grouped) {
        const ids = list.map((a) => a.attributeValueId).filter((v) => v !== undefined && v !== null);
        if (ids.length > 1) out.push({ attributeId, attributeValueIds: ids });
        else if (ids.length === 1) out.push({ attributeId, attributeValueId: ids[0] });
        else {
            const text = list.map((a) => String(a.attributeValue ?? a.customAttributeValue ?? "").trim()).filter(Boolean).join(", ");
            if (text) out.push({ attributeId, customAttributeValue: text });
        }
    }
    return out;
}

async function runOperatorSend(startedAt: string, opts: { mode: SendMode; limit?: number; onlyOnSale?: boolean }) {
    const onlyOnSale = opts.onlyOnSale !== false;
    const { client, getJson, sellerBase, gatewayUrl } = await trendyolContext();
    const resolve = await loadBrandResolver();

    type Candidate = { item: any; resolved: ResolvedBrand; status: OperatorStatus; originMissing: boolean; originSource?: string };
    const candidates: Candidate[] = [];
    await scanApprovedContents(getJson, sellerBase, async (items, page, totalPages) => {
        for (const item of items) {
            const vs = liveVariants(item);
            if (onlyOnSale && !vs.some((v) => v.onSale)) continue;
            const { status } = operatorStatusOf(item.attributes);
            if (status === "FULL") continue;
            const resolved = resolve(item);
            const origin = originInfoOf(item);
            candidates.push({ item, resolved, status, originMissing: origin.missing, originSource: origin.variantOrigin || resolved.origin });
        }
        await saveState({ running: true, mode: opts.mode, onlyOnSale, startedAt, progress: `Trendyol ilanları okunuyor: sayfa ${page} / ${totalPages}` });
    });

    // Kategori özellikleri (hangi üretici / ithalatçı alanları var), kategori başına bir kez
    const categoryAttrs = new Map<number, { id: number; name: string }[]>();
    const attrsOf = async (categoryId: number) => {
        if (categoryAttrs.has(categoryId)) return categoryAttrs.get(categoryId)!;
        const data: any = await getJson(`${gatewayUrl}/integration/product/categories/${categoryId}/attributes`).catch(() => null);
        const raw: any[] = Array.isArray(data) ? data : data?.categoryAttributes || data?.attributes || [];
        const list = raw
            .map((a) => (a.attribute ? { id: Number(a.attribute.id), name: String(a.attribute.name || "") } : { id: Number(a.id), name: String(a.name || "") }))
            .filter((a) => a.id);
        categoryAttrs.set(categoryId, list);
        return list;
    };

    // Menşei değer listesi (özellik başına bir kez)
    const originValuesCache = new Map<string, { id: number; name: string }[]>();
    const originValuesOf = async (categoryId: number, attributeId: number) => {
        const key = String(attributeId);
        if (originValuesCache.has(key)) return originValuesCache.get(key)!;
        const data: any = await getJson(`${gatewayUrl}/integration/product/categories/${categoryId}/attributes/${attributeId}/values?size=1000`).catch(() => null);
        const raw: any[] = Array.isArray(data) ? data : data?.content || data?.attributeValues || [];
        const list = raw.map((v) => ({ id: Number(v.attributeValueId ?? v.id), name: String(v.attributeValue ?? v.name ?? "") })).filter((v) => v.id && v.name);
        if (list.length) originValuesCache.set(key, list);
        return list;
    };

    const skipped: Record<string, number> = {};
    const warnings: Record<string, number> = {};
    const warn = (reason: string) => { warnings[reason] = (warnings[reason] || 0) + 1; };
    const notes: Record<string, number> = {};
    const note = (text: string) => { notes[text] = (notes[text] || 0) + 1; };
    const skip = (reason: string) => { skipped[reason] = (skipped[reason] || 0) + 1; };
    const ready: { payload: any; log: SentItem }[] = [];

    let checked = 0;
    for (const c of candidates) {
        checked++;
        if (checked % 50 === 0) await saveState({ running: true, mode: opts.mode, onlyOnSale, startedAt, progress: `İlanlar hazırlanıyor: ${checked} / ${candidates.length}` });

        const brand = c.resolved.brand;
        if (!brand) { skip(c.resolved.kind === "NO_BRAND" ? "Bizdeki ürüne marka seçilmemiş" : "Ürün ve marka bizde bulunamadı"); continue; }
        if (!brand.manufacturer && !brand.importer) { skip("Markada firma tanımsız"); continue; }
        const categoryId = Number(c.item.category?.id);
        if (!categoryId) { skip("İlanın kategorisi okunamadı"); continue; }

        const catAttrs = await attrsOf(categoryId);
        const ops = { manufacturer: brand.manufacturer, importer: brand.importer };
        const values: Record<string, string> = {};
        const newAttrs: { attributeId: number; customAttributeValue: string }[] = [];
        // Kategorideki birincil üretici / ithalatçı alanları: hepsi temizlenir, bizdeki firmadan dolanlar yazılır
        const operatorIds = new Set<number>();
        for (const a of catAttrs) {
            if (!fieldOf({ attributeId: a.id, attributeName: a.name })) continue;
            operatorIds.add(a.id);
            const v = operatorValueFor(a.name, ops);
            if (v && v.trim()) {
                newAttrs.push({ attributeId: a.id, customAttributeValue: v.trim() });
                values[a.name] = v.trim();
            }
        }
        // İlanda olup kategoride görünmeyen eski birincil alanlar da temizlenir
        for (const a of Array.isArray(c.item.attributes) ? c.item.attributes : []) {
            if (fieldOf(a)) operatorIds.add(Number(a.attributeId));
        }
        if (newAttrs.length === 0) { skip("Kategoride üretici / ithalatçı alanı yok"); continue; }

        // Menşei boşsa Trendyol güncellemeyi reddediyor. Sıra: Trendyol varyant kodu / bizdeki ürün kartı,
        // yoksa markanın firmasına göre varsayılan (ithalatçı → CN, sadece imalatçı → TR; kullanıcı kararı)
        const originAttrs: { attributeId: number; attributeValueId: number }[] = [];
        if (c.originMissing) {
            const originAttr = catAttrs.find((a) => isOriginAttr({ attributeId: a.id, attributeName: a.name }));
            const fallback = defaultOriginFor(brand);
            const source = c.originSource || fallback;
            if (originAttr && source) {
                const list = await originValuesOf(categoryId, originAttr.id);
                let match = matchOriginValue(source, list);
                let label = c.originSource ? "" : ` (${fallback === "CN" ? "ithalatçı" : "imalatçı"} varsayılanı)`;
                // Kendi bilgisi Trendyol listesinde yoksa varsayılana düşülür
                if (!match && c.originSource && fallback) {
                    match = matchOriginValue(fallback, list);
                    label = ` (${fallback === "CN" ? "ithalatçı" : "imalatçı"} varsayılanı; "${c.originSource}" tanınmadı)`;
                }
                if (match) {
                    originAttrs.push({ attributeId: originAttr.id, attributeValueId: match.id });
                    values[originAttr.name] = match.name + label;
                    if (label) note(`Menşei varsayılandan yazıldı: ${fallback}`);
                } else warn(`Menşei boş, "${source}" Trendyol listesinde bulunamadı`);
            } else if (originAttr) warn("Menşei boş ve elimizde menşei bilgisi yok (Trendyol reddedebilir)");
        }

        ready.push({
            payload: {
                contentId: Number(c.item.contentId),
                attributes: [
                    ...currentAttributesPayload(c.item.attributes, new Set([...operatorIds, ...originAttrs.map((o) => o.attributeId)])),
                    ...newAttrs,
                    ...originAttrs,
                ],
            },
            log: {
                contentId: Number(c.item.contentId),
                title: String(c.item.title || ""),
                brand: brand.name,
                trendyolBrand: String(c.item.brand?.name || ""),
                previous: c.status,
                productUrl: String(liveVariants(c.item).find((v: any) => v.productUrl)?.productUrl || "") || undefined,
                values,
            },
        });
    }

    // Denemede karışık örnek: önce boş, sonra eksik ilanlardan
    let toSend = ready;
    if (opts.mode === "test") {
        const n = Math.max(1, Math.min(opts.limit || 5, 20));
        const empties = ready.filter((r) => r.log.previous === "EMPTY");
        const partials = ready.filter((r) => r.log.previous === "PARTIAL");
        const half = Math.ceil(n / 2);
        toSend = [...empties.slice(0, half), ...partials.slice(0, n - Math.min(half, empties.length))].slice(0, n);
        if (toSend.length < n) toSend = ready.slice(0, n);
    }

    const batches: string[] = [];
    const batchErrors: string[] = [];
    const sentLog: SentItem[] = [];
    if (opts.mode !== "dry") {
        for (let i = 0; i < toSend.length; i += 100) {
            const chunk = toSend.slice(i, i + 100);
            await saveState({ running: true, mode: opts.mode, onlyOnSale, startedAt, progress: `Trendyol'a gönderiliyor: ${Math.min(i + chunk.length, toSend.length)} / ${toSend.length}` });
            const res: any = await client.updateApprovedProductContent(chunk.map((r) => r.payload)).catch((e: any) => ({ ok: false, message: e?.message }));
            if (res?.ok && res.batchRequestId) {
                batches.push(res.batchRequestId);
                for (const r of chunk) sentLog.push({ ...r.log, batchRequestId: res.batchRequestId, result: "PENDING" });
            } else {
                batchErrors.push(String(res?.errors?.[0]?.message || res?.message || JSON.stringify(res).slice(0, 300)));
            }
            await new Promise((r) => setTimeout(r, 1000));
        }
    }

    await saveState({
        running: false,
        mode: opts.mode,
        onlyOnSale,
        startedAt,
        finishedAt: new Date().toISOString(),
        summary: { candidates: candidates.length, ready: ready.length, sent: sentLog.length, skipped, warnings, notes, batches, batchErrors },
        items: (opts.mode === "dry" ? toSend.map((r) => r.log) : sentLog).slice(0, MAX_SENT_LOG),
    });
}

/**
 * Gönderilen ilanların Trendyol sonucunu okur. İki kaynak:
 *  1) Toplu işlem sonucu (batch-requests): Trendyol isteği baştan reddettiyse sebep burada (ör. geçersiz özellik).
 *  2) Ürün kontrol adımı (update-audits): istek kabul edildiyse içerik kontrolünün sonucu (onay / yasaklı kelime vb.).
 * En fazla `max` ilan sorulur; sonucu belli olanlar tekrar sorulmaz.
 */
export async function checkSendResults(max = 60): Promise<{ checked: number; message: string }> {
    const state = await getSendState();
    if (state.running) return { checked: 0, message: "İşlem sürüyor, bitince kontrol edin." };
    const items = state.items || [];
    const pending = items.filter((i) => i.batchRequestId && (!i.result || i.result === "PENDING")).slice(0, max);
    if (pending.length === 0) return { checked: 0, message: "Kontrol edilecek bekleyen ilan yok." };

    const { getJson, sellerBase } = await trendyolContext();
    const sentAt = state.finishedAt ? new Date(state.finishedAt).getTime() - 15 * 60 * 1000 : 0;

    // 1) Toplu işlem sonuçları
    const batchInfo = new Map<string, { status: string; byContent: Map<number, { status: string; reasons: string }> }>();
    for (const id of [...new Set(pending.map((p) => p.batchRequestId!))]) {
        try {
            const data: any = await getJson(`${sellerBase}/products/batch-requests/${id}`);
            const byContent = new Map<number, { status: string; reasons: string }>();
            for (const row of Array.isArray(data?.items) ? data.items : []) {
                const cid = Number(row?.requestItem?.contentId ?? row?.requestItem?.product?.contentId ?? row?.contentId);
                const reasons = (row?.failureReasons || []).map((r: any) => (typeof r === "string" ? r : r?.message || r?.reason || JSON.stringify(r))).join("; ");
                if (cid) byContent.set(cid, { status: String(row?.status || ""), reasons });
            }
            batchInfo.set(id, { status: String(data?.status || ""), byContent });
        } catch (e: any) {
            batchInfo.set(id, { status: `sorgulanamadı: ${e?.message || e}`, byContent: new Map() });
        }
    }

    for (const it of pending) {
        const batch = batchInfo.get(it.batchRequestId!);
        const row = batch?.byContent.get(it.contentId);
        if (row && /fail/i.test(row.status)) {
            it.result = "FAIL";
            it.resultNote = `Trendyol isteği reddetti: ${row.reasons || row.status}`;
            continue;
        }
        // 2) Ürün kontrol adımı
        try {
            const data: any = await getJson(`${sellerBase}/products/${it.contentId}/update-audits`);
            const audits: any[] = Array.isArray(data?.content) ? data.content : [];
            const mine = audits.find((a) => a.batchRequestId === it.batchRequestId)
                // Numara tutmazsa gönderimden sonraki en yeni kayıt
                || audits.filter((a) => new Date(a.requestDate || 0).getTime() >= sentAt)
                    .sort((x, y) => new Date(y.requestDate || 0).getTime() - new Date(x.requestDate || 0).getTime())[0];
            const update = mine?.updates?.find((u: any) => u.type === "ATTRIBUTE") || mine?.updates?.[0];
            if (!update) {
                it.result = "PENDING";
                it.resultNote = `Trendyol henüz kontrol etmedi (toplu işlem: ${batch?.status || "?"}${row ? `, ilan: ${row.status}` : ""})`;
                continue;
            }
            if (update.status === "SUCCESS") { it.result = "SUCCESS"; it.resultNote = undefined; }
            else if (update.status === "FAIL") {
                it.result = "FAIL";
                it.resultNote = (update.rejectReasons || []).map((r: any) => r.reason || r.detail || r.type).filter(Boolean).join("; ") || "Reddedildi";
            } else { it.result = "PENDING"; it.resultNote = `Trendyol durumu: ${update.status}`; }
        } catch (e: any) {
            it.resultNote = `Sorgulanamadı: ${e?.message || e}`;
        }
        await new Promise((r) => setTimeout(r, 300));
    }
    await saveState({ ...state, items });
    const done = pending.filter((p) => p.result === "SUCCESS" || p.result === "FAIL").length;
    return { checked: pending.length, message: `${pending.length} ilan soruldu, ${done} tanesinin sonucu belli.` };
}
