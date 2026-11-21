// Ürün videoları: YouTube linklerini (Shorts dahil) çözümler. Video Serin'in sunucusundan değil YouTube'dan oynar;
// kapak resmi de YouTube'dan gelir (ayrıca görsel yüklemek gerekmez).

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export interface YouTubeVideo {
    id: string;
    /** Shorts dikey (9:16) oynatılır, diğerleri yatay (16:9) */
    isShort: boolean;
    /** Veritabanında saklanan tek tip link */
    url: string;
    thumbnailUrl: string;
    /** Çerezsiz oynatıcı (youtube-nocookie) */
    embedUrl: string;
}

/**
 * Desteklenen biçimler:
 *  youtube.com/shorts/ID · youtube.com/watch?v=ID · youtu.be/ID · youtube.com/embed/ID · youtube.com/live/ID
 *  (m. / www. / music. alt alan adları ve ?si=... gibi ekler dahil)
 */
export function parseYouTubeUrl(input: string | null | undefined): YouTubeVideo | null {
    const raw = String(input || "").trim();
    if (!raw) return null;

    let u: URL;
    try {
        u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
        return null;
    }

    const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
    const parts = u.pathname.split("/").filter(Boolean);
    let id: string | null = null;
    let isShort = false;

    if (host === "youtu.be") {
        id = parts[0] || null;
    } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
        if (parts[0] === "watch") id = u.searchParams.get("v");
        else if (parts[0] === "shorts") {
            id = parts[1] || null;
            isShort = true;
        } else if (parts[0] === "embed" || parts[0] === "live" || parts[0] === "v") id = parts[1] || null;
    }

    if (!id || !ID_RE.test(id)) return null;

    return {
        id,
        isShort,
        url: isShort ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`,
    };
}

/** Formdan gelen listeyi temizler: geçersizleri atar, aynı videoyu bir kez tutar, tek tip linke çevirir. */
export function normalizeYouTubeUrls(list: unknown): string[] {
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of list) {
        const v = parseYouTubeUrl(typeof item === "string" ? item : "");
        if (v && !seen.has(v.id)) {
            seen.add(v.id);
            out.push(v.url);
        }
    }
    return out;
}
