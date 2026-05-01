
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

/**
 * IMAGE DOWNLOAD SCRIPT
 * Source: https://www.ladamarketi.com/img/p/...
 * Target: ./public/img/p/...
 * Strategy:
 * 1. Fetch all products from DB.
 * 2. identifying missing images locally.
 * 3. Download concurrently with limit.
 */

const prisma = new PrismaClient();
const BASE_URL = 'https://www.ladamarketi.com';
const TARGET_DIR = path.join(process.cwd(), 'public', 'img', 'p');
const CONCURRENCY = 5;

async function main() {
    console.log('🚀 Resim indirme aracı başlatılıyor...');

    // 1. Get all data with images
    const [products, categories, sliders] = await Promise.all([
        prisma.product.findMany({
            select: { id: true, images: true },
            where: { images: { isEmpty: false } }
        }),
        prisma.category.findMany({
            select: { id: true, imageUrl: true },
            where: {
                AND: [
                    { imageUrl: { not: null } },
                    { imageUrl: { not: "" } }
                ]
            }
        }),
        prisma.slider.findMany({
            select: { id: true, imageUrl: true },
            where: { imageUrl: { not: "" } }
        })
    ]);

    console.log(`📦 Veriler toplandı: ${products.length} ürün, ${categories.length} kategori, ${sliders.length} slider.`);

    let downloadQueue: { url: string; path: string }[] = [];

    // Products
    for (const p of products) {
        for (const imgUrl of p.images) {
            addIfMissing(imgUrl, downloadQueue);
        }
    }

    // Categories
    for (const c of categories) {
        if (c.imageUrl) addIfMissing(c.imageUrl, downloadQueue);
    }

    // Sliders
    for (const s of sliders) {
        if (s.imageUrl) addIfMissing(s.imageUrl, downloadQueue);
    }

    console.log(`⬇️ İndirilecek yeni resim sayısı: ${downloadQueue.length}`);
    if (downloadQueue.length === 0) {
        console.log('✅ Tüm resimler zaten mevcut veya indirilecek resim bulunamadı.');
        return;
    }

    // 3. Process queue
    let processed = 0;
    const total = downloadQueue.length;
    const chunked = chunk(downloadQueue, CONCURRENCY);

    for (const batch of chunked) {
        await Promise.all(batch.map(async (item) => {
            try {
                await downloadFile(item.url, item.path);
                processed++;
                process.stdout.write(`\r✅ İlerleme: ${processed}/${total}`);
            } catch (error) {
                // Sadece 404 değilse hata bas, bazı resimler silinmiş olabilir
                if (!(error as any).message.includes('404')) {
                    console.error(`\n❌ Hata: ${item.url} -> ${(error as Error).message}`);
                }
            }
        }));
    }

    console.log('\n🏁 İşlem Tamamlandı.');
}

function addIfMissing(imgUrl: string, queue: { url: string; path: string }[]) {
    // URL kontrolü - Eğer zaten tam URL ise (https://...) indirmeyebiliriz veya başka işlem yapabiliriz
    if (imgUrl.startsWith('http')) return;

    const targetPath = path.join(process.cwd(), 'public', imgUrl);
    const sourceUrl = `${BASE_URL}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;

    if (!fs.existsSync(targetPath)) {
        queue.push({ url: sourceUrl, path: targetPath });
    }
}

async function downloadFile(url: string, destPath: string) {
    // Ensure directory exists
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body) throw new Error('No body');

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            throw new Error('Content-Type is text/html (WAF Block)');
        }

        // Node.js readable stream from fetch body
        // @ts-ignore
        const stream = Readable.fromWeb(response.body as any);
        await pipeline(stream, fs.createWriteStream(destPath));
    } catch (error) {
        // Fallback to Archive.org if 404
        if ((error as any).message.includes('404') ||
            (error as any).message.includes('403') ||
            (error as any).message.includes('text/html') ||
            (error as any).message.includes('WAF Block')) {

            console.log(`\n⚠️  ${url} erişilemedi, Archive.org deneniyor...`);
            const archiveUrl = `https://web.archive.org/web/20240000000000id_/${url}`;

            try {
                const archiveResponse = await fetch(archiveUrl, { headers });
                if (!archiveResponse.ok) throw new Error(`Archive HTTP ${archiveResponse.status}`);
                if (!archiveResponse.body) throw new Error('No archive body');

                const archiveType = archiveResponse.headers.get('content-type');
                if (archiveType && archiveType.includes('text/html')) {
                    console.log(`\n⚠️  Archive.org HTML döndürdü: ${url}`);
                }

                // @ts-ignore
                const archiveStream = Readable.fromWeb(archiveResponse.body as any);
                await pipeline(archiveStream, fs.createWriteStream(destPath));
                // console.log(`✅  Archive.org'dan kurtarıldı: ${url}`);
                return;
            } catch (archiveError) {
                throw new Error(`Orjinal ve Arşiv başarısız: ${(archiveError as Error).message}`);
            }
        }
        throw error;
    }
}

function chunk<T>(arr: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
    );
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
