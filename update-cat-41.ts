import fs from 'fs';
import readline from 'readline';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DUMP_FILE = 'u1184310_lada.sql';
const TARGET_CAT_ID_ORIGINAL = 41;

async function main() {
    console.log('🚀 Kategori 41 Güncelleme Scripti Başlatılıyor...');

    // 1. Find Target Category DB ID
    // We found earlier that Category 41 is "Lada Niva-1700-İ Yedek Parçaları"
    const targetCat = await prisma.category.findUnique({ // Wait, we don't know the exact ID yet
        // Let's use the slug we know or find by name
        where: { slug: 'lada-niva-1700-i-yedek-paralar-41' }
    });

    if (!targetCat) {
        console.error("❌ Hedef kategori (ID 41) veritabanında bulunamadı!");
        process.exit(1);
    }

    console.log(`✅ Hedef Kategori Bulundu: ${targetCat.name} (${targetCat.id})`);

    // 2. Parse Dump for products attached to Category 41
    const productIdsToUpdate = await parseDumpForCategoryProducts(TARGET_CAT_ID_ORIGINAL);
    console.log(`📋 Dump dosyasında ${productIdsToUpdate.length} adet ürün bu kategoriye bağlı görünüyor.`);

    // 3. Update Products
    let updatedCount = 0;

    for (const originalPid of productIdsToUpdate) {
        // Find product in DB
        const products = await prisma.product.findMany({
            where: { slug: { endsWith: `-${originalPid}` } },
            include: { category: true }
        });

        for (const product of products) {
            // Logic: 
            // If product is in Root (Home) -> Update immediately
            // If product is in another "real" category -> Maybe skip or warn? 
            // User query implies these ARE the products fitting this category.
            // Let's print what we do.

            const currentCatName = product.category ? product.category.name : "Yok";

            // Only update if not already in target category
            if (product.categoryId !== targetCat.id) {
                await prisma.product.update({
                    where: { id: product.id },
                    data: { categoryId: targetCat.id }
                });
                console.log(`✅ Ürün Güncellendi: ${product.name} (Eski Kat: ${currentCatName}) -> Kategori 41`);
                updatedCount++;
            } else {
                console.log(`ℹ️ Ürün zaten bu kategoride: ${product.name}`);
            }
        }
    }

    console.log(`\n🎉 Toplam ${updatedCount} ürün Kategori 41'e taşındı.`);
}

async function parseDumpForCategoryProducts(targetCatId: number): Promise<number[]> {
    const fileStream = fs.createReadStream(DUMP_FILE, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const ids: number[] = [];
    let currentTable = '';

    for await (const line of rl) {
        const trimmed = line.trim();
        if (trimmed.startsWith('INSERT INTO')) {
            if (trimmed.includes('`ps_category_product`')) currentTable = 'ps_category_product';
            else currentTable = '';
        }

        if (currentTable === 'ps_category_product' && trimmed.startsWith('(')) {
            const cleanLine = trimmed.replace(/;$/, '');
            const tuples = splitValues(cleanLine);
            for (const tuple of tuples) {
                const vals = parseTuple(tuple);
                // id_category, id_product
                const catId = Number(vals[0]);
                const prodId = Number(vals[1]);
                if (catId === targetCatId) {
                    ids.push(prodId);
                }
            }
        }
    }
    return ids;
}

// Utils
function parseTuple(tuple: string): any[] {
    const res: any[] = [];
    let current = '';
    let inQuote = false;
    let escape = false;
    const content = tuple.substring(1, tuple.length - 1);
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === '\\') { escape = true; current += char; continue; }
        if (char === "'" && !escape) { inQuote = !inQuote; current += char; continue; }
        if (char === ',' && !inQuote) { res.push(cleanValue(current)); current = ''; }
        else { current += char; }
        if (escape) escape = false;
    }
    res.push(cleanValue(current));
    return res;
}

function cleanValue(val: string): any {
    val = val.trim();
    if (val === 'NULL') return null;
    if (val.startsWith("'") && val.endsWith("'")) {
        val = val.substring(1, val.length - 1);
        try { return val.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\r/g, '\r').replace(/\\n/g, '\n'); } catch { return val; }
    }
    if (!isNaN(Number(val))) return Number(val);
    return val;
}

function splitValues(line: string): string[] {
    const parts: string[] = [];
    let buffer = '';
    let inQuote = false;
    let escape = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '\\') { escape = true; buffer += char; continue; }
        if (char === "'" && !escape) { inQuote = !inQuote; }
        escape = false;
        if (char === ',' && !inQuote && line[i + 1] === '(' && line[i - 1] === ')') {
            parts.push(buffer);
            buffer = '';
            if (line[i + 1] === ' ') i++;
            continue;
        }
        buffer += char;
    }
    parts.push(buffer);
    return parts.map(p => p.trim()).filter(p => p.startsWith('('));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
