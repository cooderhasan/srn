import fs from 'fs';
import readline from 'readline';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DUMP_FILE = 'u1184310_lada.sql';

const referenceMap = new Map<number, string>();

async function main() {
    console.log('🚀 SKU Güncelleme Scripti Başlatılıyor...');

    // 1. Parse Dump File
    await parseDumpFile();
    console.log(`✅ ${referenceMap.size} adet referans kodu bulundu.`);

    // 2. Fetch all products
    const products = await prisma.product.findMany({
        select: { id: true, slug: true }
    });

    console.log(`📦 Veritabanında ${products.length} ürün var.`);

    // 3. Update SKUs
    let updatedCount = 0;
    for (const product of products) {
        // Extract ID from slug (e.g. "product-name-123")
        const parts = product.slug.split('-');
        const originalIdStr = parts[parts.length - 1];
        const originalId = Number(originalIdStr);

        if (!isNaN(originalId) && referenceMap.has(originalId)) {
            const ref = referenceMap.get(originalId);
            if (ref && ref.trim() !== '') {
                try {
                    await prisma.product.update({
                        where: { id: product.id },
                        data: { sku: ref }
                    });
                } catch (e: any) {
                    if (e.code === 'P2002') {
                        // Unique constraint violation - append ID
                        const newSku = `${ref}-${originalId}`;
                        try {
                            await prisma.product.update({
                                where: { id: product.id },
                                data: { sku: newSku }
                            });
                            console.log(`⚠️ Duplicate SKU found for ${ref}, updated as ${newSku}`);
                        } catch (innerE) {
                            console.error(`❌ Failed to update SKU for product ${product.id}: ${innerE}`);
                        }
                    } else {
                        console.error(`❌ Error updating product ${product.id}: ${e}`);
                    }
                }
                updatedCount++;
                if (updatedCount % 100 === 0) process.stdout.write('.');
            }
        }
    }

    console.log(`\n🎉 Toplam ${updatedCount} ürünün stok kodu güncellendi.`);
}

async function parseDumpFile() {
    const fileStream = fs.createReadStream(DUMP_FILE, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let currentTable = '';

    console.log('📂 Dosya taranıyor...');
    for await (const line of rl) {
        const trimmed = line.trim();
        if (trimmed.startsWith('INSERT INTO')) {
            if (trimmed.includes('`ps_product`')) currentTable = 'ps_product';
            else currentTable = '';
        }

        if (currentTable === 'ps_product' && trimmed.startsWith('(')) {
            const cleanLine = trimmed.replace(/;$/, '');
            const tuples = splitValues(cleanLine);

            for (const tuple of tuples) {
                const vals = parseTuple(tuple);
                // Index 0: ID, Index 18: Reference
                const id = vals[0];
                const ref = vals[18];
                if (id && typeof ref === 'string') {
                    referenceMap.set(id, ref);
                }
            }
        }
    }
}

// Utils (Same as before)
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
