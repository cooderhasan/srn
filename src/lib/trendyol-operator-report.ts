import prisma from "@/lib/db";
import { TrendyolClient } from "@/services/trendyol/api";

/**
 * Trendyol'daki onaylı ilanlarda ürün güvenliği (üretici / ithalatçı) bilgilerinin girilip girilmediğini raporlar.
 * SADECE OKUR, Trendyol'a hiçbir şey göndermez. Trendyol panelinde bunun için filtre yok.
 * Gönderim ayrı: lib/trendyol-operator-send.ts (tarama ve marka eşleştirmesi buradan ortak kullanılır).
 *
 * Alanlar (Trendyol kategori özellikleri, serbest metin):
 *  1198 Üretici Adı, 1296 Üretici Adres, 1294 Üretici Mail
 *  1216 / 1304 / 1305 Birincil İthalatçı Adı / Adres / Mail
 * Numara tutmazsa özellik adından da tanınır.
 *
 * Marka: ilan barkod / stok koduyla bizdeki ürüne eşleştirilir, marka ve firma bizdeki üründen gelir
 * (Trendyol ilanın markasını sonradan değiştirebiliyor: Gogo ilanı "Universal" / "Genel Markalar" olmuş).
 * Ürün bizde yoksa (eski Entegra ilanları) Trendyol'daki marka numarası / adıyla bizdeki markaya bağlanır.
 */

const SETTINGS_KEY = "trendyolOperatorReport";

export type Field = "mName" | "mAddress" | "mMail" | "iName" | "iAddress" | "iMail";
const FIELD_IDS: Record<number, Field> = { 1198: "mName", 1296: "mAddress", 1294: "mMail", 1216: "iName", 1304: "iAddress", 1305: "iMail" };

/** Özellik bir birincil üretici / ithalatçı alanı mı (ikincil / üçüncül ithalatçı null) */
export function fieldOf(attr: { attributeId?: number; attributeName?: string }): Field | null {
    const byId = FIELD_IDS[Number(attr.attributeId)];
    if (byId) return byId;
    const n = String(attr.attributeName || "").toLocaleLowerCase("tr-TR");
    if (/ikincil|üçüncül|ucuncul/.test(n)) return null;
    const kind = /ithalat/.test(n) ? "i" : /üretici|uretici|imalat/.test(n) ? "m" : null;
    if (!kind) return null;
    if (/mail|e-posta|eposta/.test(n)) return `${kind}Mail` as Field;
    if (n.includes("adres")) return `${kind}Address` as Field;
    if (/\badı\b|\bad\b|unvan|ünvan|isim/.test(n)) return `${kind}Name` as Field;
    return null;
}

export type OperatorStatus = "FULL" | "PARTIAL" | "EMPTY";

/** İlanın içerik özelliklerinden hangi alanların dolu olduğu ve durumu */
export function operatorStatusOf(attributes: any[]): { status: OperatorStatus; filled: Field[] } {
    const filled = new Set<Field>();
    for (const a of (Array.isArray(attributes) ? attributes : [])) {
        const f = fieldOf(a);
        const value = String(a.attributeValue ?? a.customAttributeValue ?? "").trim();
        if (f && value) filled.add(f);
    }
    const manufacturerFull = filled.has("mName") && filled.has("mAddress") && filled.has("mMail");
    const importerFull = filled.has("iName") && filled.has("iAddress") && filled.has("iMail");
    return { status: manufacturerFull || importerFull ? "FULL" : filled.size > 0 ? "PARTIAL" : "EMPTY", filled: [...filled] };
}

/** Menşei özelliği mi (Trendyol: 1192 "Menşei") */
export const isOriginAttr = (a: { attributeId?: number; attributeName?: string }) =>
    Number(a.attributeId) === 1192 || /men[şs]ei/i.test(String(a.attributeName || ""));

/**
 * İlanda Menşei dolu mu. Boşsa Trendyol içerik güncellemesini "Zorunlu Ürün Özelliği Eksik" diye reddediyor.
 * variantOrigin: Trendyol'un varyantta tuttuğu menşei kodu (ör. "CN"); doldurmak için kaynak olabilir.
 */
export function originInfoOf(item: any): { missing: boolean; variantOrigin?: string } {
    const has = (Array.isArray(item.attributes) ? item.attributes : [])
        .some((a: any) => isOriginAttr(a) && String(a.attributeValue ?? a.customAttributeValue ?? a.attributeValueId ?? "").trim());
    const vs: any[] = Array.isArray(item.variants) ? item.variants : [];
    const variantOrigin = String(vs.find((v) => v.origin)?.origin || "").trim() || undefined;
    return { missing: !has, variantOrigin };
}

/**
 * Menşei için son çare (kullanıcı kararı, 2026-11-11): ürünün kendi menşei bilgisi yoksa markanın firmasına göre;
 * ithalatçı tanımlıysa CN (ithal ürünlerin çoğu Çin), sadece imalatçı tanımlıysa TR. Sadece Menşei boş ilanlarda kullanılır.
 */
export function defaultOriginFor(brand: { manufacturer: unknown; importer: unknown } | null | undefined): "CN" | "TR" | undefined {
    if (!brand) return undefined;
    if (brand.importer) return "CN";
    if (brand.manufacturer) return "TR";
    return undefined;
}

export interface OperatorReportRow {
    contentId: number;
    productMainId: string;
    title: string;
    /** Raporun gruplandığı marka: bizdeki marka; bağlanamadıysa Trendyol'daki marka */
    brand: string;
    /** Trendyol'da görünen marka (Trendyol sonradan "Universal", "Genel Markalar" gibi değiştirebiliyor) */
    trendyolBrand?: string;
    /** İlan barkod / stok koduyla bizdeki bir ürüne eşleşti mi */
    matched?: boolean;
    barcodes: string[];
    onSale: boolean;
    status: OperatorStatus;
    /** Dolu alanlar: ÜA ÜAd ÜM İA İAd İM */
    filled: Field[];
    /** Menşei boş (Trendyol güncellemeyi reddeder) */
    originMissing?: boolean;
    /** Menşei'yi doldurmak için elimizdeki bilgi: Trendyol varyant kodu ya da bizdeki ürünün Menşei alanı */
    originSource?: string;
}

/**
 * OURS: ilan bizdeki ürüne eşleşti, marka bizdeki ürünün markası
 * BY_NAME: ürün bizde yok, Trendyol'daki markayla bizdeki markaya bağlandı (eski Entegra ilanları)
 * NO_BRAND: ürün bizde var ama markası seçilmemiş
 * NOT_FOUND: ürün de marka da bizde bulunamadı; Trendyol'daki markaya göre gruplanır
 */
export type OperatorBrandKind = "OURS" | "BY_NAME" | "NO_BRAND" | "NOT_FOUND";

export interface OperatorReportBrand {
    brand: string;
    kind?: OperatorBrandKind;
    total: number;
    full: number;
    partial: number;
    empty: number;
    /** Bizdeki markada imalatçı/ithalatçı firma tanımlı mı (null: ilan bizdeki bir markaya bağlanamadı) */
    firmDefined: boolean | null;
    /** Aynı sayılar sadece satıştaki ilanlar için */
    onSale?: { total: number; full: number; partial: number; empty: number };
}

export interface OperatorReport {
    running: boolean;
    startedAt?: string;
    finishedAt?: string;
    error?: string;
    progress?: { page: number; totalPages: number };
    totals?: { contents: number; onSale: number; full: number; partial: number; empty: number };
    /** Sadece satıştaki ilanların Tam / Eksik / Boş sayıları */
    onSaleTotals?: { full: number; partial: number; empty: number };
    /** Menşei boş ilan sayıları; withSource: doldurmak için bilgimiz olanlar */
    originMissing?: { all: number; onSale: number; withSource: number };
    brands?: OperatorReportBrand[];
    /** Eksik ve boş ilanlar ile Menşei boş ilanlar (tam ve Menşei dolu olanlar listelenmez) */
    rows?: OperatorReportRow[];
}

export async function getOperatorReport(): Promise<OperatorReport> {
    const row = await prisma.siteSettings.findUnique({ where: { key: SETTINGS_KEY } });
    const report = ((row?.value as any) || { running: false }) as OperatorReport;
    // Sunucu yeniden başlarsa yarıda kalan rapor "çalışıyor" görünmesin
    if (report.running && report.startedAt && Date.now() - new Date(report.startedAt).getTime() > 30 * 60 * 1000) {
        return { ...report, running: false, error: report.error || "Rapor yarıda kaldı (sunucu yeniden başlamış olabilir). Tekrar başlatın." };
    }
    return report;
}

async function saveReport(report: OperatorReport) {
    await prisma.siteSettings.upsert({
        where: { key: SETTINGS_KEY },
        update: { value: report as any },
        create: { key: SETTINGS_KEY, value: report as any },
    });
}

// "BISAN" / "Bisan" / "BİSAN" aynı sayılsın: Türkçe harfler sadeleştirilip küçük harfle karşılaştırılır
export const trKey = (s: string) =>
    s.replace(/[İIı]/g, "i").replace(/[Şş]/g, "s").replace(/[Ğğ]/g, "g").replace(/[Üü]/g, "u").replace(/[Öö]/g, "o").replace(/[Çç]/g, "c")
        .toLowerCase().replace(/\s+/g, " ").trim();

// ---- Ortak: Trendyol'daki onaylı ilanları sayfa sayfa okuma ----

export async function trendyolContext() {
    const client: any = new TrendyolClient();
    await client.init();
    const sellerBase = `${client.gatewayUrl}/integration/product/sellers/${client.creds.supplierId}`;
    const headers = () => ({ ...client.getHeaders(), "Accept-Language": "tr" });

    /** GET isteği; hız sınırı / geçici hatada bekleyip tekrar dener */
    const getJson = async (url: string) => {
        for (let attempt = 0; ; attempt++) {
            const res = await fetch(url, { headers: headers() });
            if (res.ok) return res.json();
            if ((res.status === 429 || res.status >= 500) && attempt < 4) {
                await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
                continue;
            }
            throw new Error(`Trendyol ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
        }
    };
    return { client, sellerBase, gatewayUrl: client.gatewayUrl as string, getJson };
}

/** Bütün onaylı ilanları okur; her sayfadaki ilanlar onPage'e verilir. Arşivlenmiş ilanlar atlanır. */
export async function scanApprovedContents(
    getJson: (url: string) => Promise<any>,
    sellerBase: string,
    onPage: (items: any[], page: number, totalPages: number) => Promise<void> | void,
) {
    const SIZE = 100;
    let page = 0;
    let totalPages = 1;
    let nextPageToken: string | null = null;
    while (page < totalPages) {
        // page x size en fazla 10.000; sonrası nextPageToken ile
        const query: string = nextPageToken && page * SIZE >= 10000
            ? `size=${SIZE}&nextPageToken=${encodeURIComponent(nextPageToken)}`
            : `page=${page}&size=${SIZE}`;
        const data: any = await getJson(`${sellerBase}/products/approved?${query}`);
        totalPages = Number(data.totalPages || 0);
        nextPageToken = data.nextPageToken || null;
        const content: any[] = Array.isArray(data.content) ? data.content : [];
        if (content.length === 0) break;

        const live = content.filter((item) => {
            const variants: any[] = Array.isArray(item.variants) ? item.variants : [];
            return variants.length === 0 || variants.some((v) => !v.archived && !v.blacklisted);
        });
        page++;
        await onPage(live, page, totalPages);
        // Trendyol hız sınırına takılmamak için
        await new Promise((r) => setTimeout(r, 250));
    }
}

export const liveVariants = (item: any): any[] => {
    const variants: any[] = Array.isArray(item.variants) ? item.variants : [];
    const live = variants.filter((v) => !v.archived && !v.blacklisted);
    return live.length ? live : variants;
};

// ---- Ortak: ilanı bizdeki markaya bağlama ----

export type FirmInfo = { name: string; address: string; email: string };
export type ResolvedBrand = {
    kind: OperatorBrandKind;
    /** Bizdeki ürünün Menşei alanı (ürün eşleştiyse) */
    origin?: string;
    /** Bizdeki marka (NOT_FOUND / NO_BRAND'de null) */
    brand: { id: string; name: string; manufacturer: FirmInfo | null; importer: FirmInfo | null } | null;
};

export async function loadBrandResolver() {
    const pick = (f: { name: string; address: string; email: string } | null | undefined): FirmInfo | null =>
        f ? { name: f.name, address: f.address, email: f.email } : null;
    const brands = await prisma.brand.findMany({
        select: { id: true, name: true, trendyolBrandId: true, manufacturerFirm: true, importerFirm: true },
    });
    type B = NonNullable<ResolvedBrand["brand"]>;
    const brandById = new Map<string, B>();
    const byTyId = new Map<number, B>();
    const byName = new Map<string, B>();
    const hasFirm = (b: B) => !!(b.manufacturer || b.importer);
    for (const b of brands) {
        const info: B = { id: b.id, name: b.name, manufacturer: pick(b.manufacturerFirm), importer: pick(b.importerFirm) };
        brandById.set(b.id, info);
        // Aynı Trendyol markasına / ada bağlı birden fazla marka varsa firması tanımlı olan tercih edilir
        if (b.trendyolBrandId && (!byTyId.has(b.trendyolBrandId) || (!hasFirm(byTyId.get(b.trendyolBrandId)!) && hasFirm(info)))) byTyId.set(b.trendyolBrandId, info);
        const k = trKey(b.name);
        if (!byName.has(k) || (!hasFirm(byName.get(k)!) && hasFirm(info))) byName.set(k, info);
    }

    const products = await prisma.product.findMany({
        select: {
            sku: true, barcode: true, gtin: true, brandId: true, origin: true,
            variants: { select: { sku: true, barcode: true } },
            trendyolProduct: { select: { barcode: true } },
        },
    });
    const codeKey = (c: string) => c.trim().toUpperCase();
    // Kod -> bizdeki ürünün marka id'si (markasız: null) ve Menşei'si
    const byCode = new Map<string, { brandId: string | null; origin?: string }>();
    for (const p of products) {
        const codes = [p.sku, p.barcode, p.gtin, p.trendyolProduct?.barcode, ...p.variants.flatMap((v) => [v.sku, v.barcode])];
        const info = { brandId: p.brandId || null, origin: (p.origin || "").trim() || undefined };
        for (const c of codes) if (c && c.trim() && !byCode.has(codeKey(c))) byCode.set(codeKey(c), info);
    }

    return (item: any): ResolvedBrand => {
        const vs = liveVariants(item);
        const codes = [...vs.map((v) => String(v.barcode || "")), ...vs.map((v) => String(v.stockCode || ""))].filter(Boolean).map(codeKey);
        const hit = codes.find((c) => byCode.has(c));
        if (hit !== undefined) {
            const { brandId, origin } = byCode.get(hit)!;
            const brand = brandId ? brandById.get(brandId) || null : null;
            return brand ? { kind: "OURS", brand, origin } : { kind: "NO_BRAND", brand: null, origin };
        }
        // Ürün bizde yok (eski Entegra ilanı): Trendyol marka numarası, yoksa adıyla
        const tyId = Number(item.brand?.id);
        const byBrand = (tyId && byTyId.get(tyId)) || byName.get(trKey(String(item.brand?.name || "")));
        return byBrand ? { kind: "BY_NAME", brand: byBrand } : { kind: "NOT_FOUND", brand: null };
    };
}

// ---- Rapor ----

/** Raporu arka planda başlatır; ilerleme ve sonuç SiteSettings'e yazılır, ekran yoklayarak okur */
export async function startOperatorReport(): Promise<{ started: boolean; message: string }> {
    const current = await getOperatorReport();
    if (current.running) return { started: false, message: "Rapor zaten hazırlanıyor." };

    const startedAt = new Date().toISOString();
    await saveReport({ ...current, running: true, startedAt, error: undefined, progress: { page: 0, totalPages: 0 } });

    void runOperatorReport(startedAt).catch(async (e) => {
        console.error("Trendyol ürün güvenliği raporu hatası:", e);
        const last = await getOperatorReport();
        await saveReport({ ...last, running: false, finishedAt: new Date().toISOString(), error: e?.message || String(e) });
    });
    return { started: true, message: "Rapor hazırlanıyor." };
}

async function runOperatorReport(startedAt: string) {
    const { getJson, sellerBase } = await trendyolContext();
    const resolve = await loadBrandResolver();

    const rows: OperatorReportRow[] = [];
    const brandMap = new Map<string, OperatorReportBrand>();
    const totals = { contents: 0, onSale: 0, full: 0, partial: 0, empty: 0 };
    const onSaleTotals = { full: 0, partial: 0, empty: 0 };
    const originMissing = { all: 0, onSale: 0, withSource: 0 };
    let lastPage = 0;
    let lastTotal = 0;

    await scanApprovedContents(getJson, sellerBase, async (items, page, totalPages) => {
        for (const item of items) {
            const vs = liveVariants(item);
            const onSale = vs.some((v) => v.onSale);
            const { status, filled } = operatorStatusOf(item.attributes);
            const bucket = status === "FULL" ? "full" : status === "PARTIAL" ? "partial" : "empty";

            totals.contents++;
            if (onSale) totals.onSale++;
            totals[bucket]++;
            if (onSale) onSaleTotals[bucket]++;

            const trendyolBrand = String(item.brand?.name || "-");
            const { kind, brand: ours, origin: ourOrigin } = resolve(item);
            const origin = originInfoOf(item);
            const fallback = defaultOriginFor(ours);
            const originSource = origin.missing
                ? (origin.variantOrigin || ourOrigin || (fallback ? `${fallback} (${fallback === "CN" ? "ithalatçı" : "imalatçı"} varsayılanı)` : undefined))
                : undefined;
            if (origin.missing) {
                originMissing.all++;
                if (onSale) originMissing.onSale++;
                if (originSource) originMissing.withSource++;
            }
            const brand = ours ? ours.name : kind === "NO_BRAND" ? "(markası seçilmemiş ürünler)" : trendyolBrand;
            // Bizdeki markaya bağlananlar (ürünle ya da adla) aynı satırda toplanır
            const key = `${ours ? "OURS" : kind}|${trKey(brand)}`;
            const b = brandMap.get(key) || {
                brand, kind: ours ? "OURS" : kind, total: 0, full: 0, partial: 0, empty: 0,
                firmDefined: ours ? !!(ours.manufacturer || ours.importer) : null,
                onSale: { total: 0, full: 0, partial: 0, empty: 0 },
            };
            b.total++;
            b[bucket]++;
            if (onSale) { b.onSale!.total++; b.onSale![bucket]++; }
            brandMap.set(key, b);

            if (status !== "FULL" || origin.missing) {
                rows.push({
                    contentId: Number(item.contentId),
                    productMainId: String(item.productMainId || ""),
                    title: String(item.title || ""),
                    brand,
                    trendyolBrand,
                    matched: kind === "OURS" || kind === "NO_BRAND",
                    barcodes: vs.map((v) => String(v.barcode || "")).filter(Boolean),
                    onSale,
                    status,
                    filled,
                    originMissing: origin.missing || undefined,
                    originSource,
                });
            }
        }
        lastPage = page;
        lastTotal = totalPages;
        await saveReport({ running: true, startedAt, progress: { page, totalPages } });
    });

    const brands = [...brandMap.values()].sort((a, b) => (b.partial + b.empty) - (a.partial + a.empty) || b.total - a.total);
    await saveReport({
        running: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        progress: { page: lastPage, totalPages: lastTotal },
        totals,
        onSaleTotals,
        originMissing,
        brands,
        rows,
    });
}
