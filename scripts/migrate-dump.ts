import fs from 'fs';
import readline from 'readline';
import { PrismaClient } from '@prisma/client';

/**
 * MIGRATION SCRIPT
 * Source: MySQL Dump (Prestashop)
 * Target: PostgreSQL (Prisma)
 * Strategy:
 * 1. Read file stream line by line.
 * 2. Parse INSERT statements.
 * 3. Store raw data in memory (Map).
 * 4. Process and Insert in order: Brands -> Categories -> Products.
 */

const prisma = new PrismaClient();
const DUMP_FILE = 'u1184310_lada.sql';

// --- Types ---
interface RawBrand { id: number; name: string; active: boolean; }
interface RawCategory { id: number; parentId: number; active: boolean; name?: string; description?: string; }
interface RawProduct {
    id: number;
    categoryId: number;
    brandId: number;
    price: number;
    reference: string;
    active: boolean;
    quantity: number;
    name?: string;
    description?: string;
    imageIds: number[];
}

// --- State ---
const brands = new Map<number, RawBrand>();
const categories = new Map<number, RawCategory>();
const products = new Map<number, RawProduct>();
const categoryLangs = new Map<number, { name: string, desc: string }>();
const productLangs = new Map<number, { name: string, desc: string }>();
const productImages = new Map<number, number[]>(); // productId -> imageIds

async function main() {
    console.log('🚀 Migrasyon Başlatılıyor...');

    // 0. Clean old data
    console.log('🧹 Eski veriler temizleniyor...');
    // Delete in reverse order of dependency
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.brand.deleteMany();

    // 1. Dosya Okuma ve Parse Etme
    await parseDumpFile();

    // 2. Veri Birleştirme
    mergeData();

    // 3. Veritabanına Yazma
    await writeToDb();
}

async function parseDumpFile() {
    const fileStream = fs.createReadStream(DUMP_FILE, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let currentTable = '';
    console.log('📂 Dosya taranıyor...');
    let lineCount = 0;

    for await (const line of rl) {
        lineCount++;
        if (lineCount % 100000 === 0) process.stdout.write(`.`);

        const trimmed = line.trim();
        if (trimmed.startsWith('INSERT INTO')) {
            if (trimmed.includes('`ps_manufacturer`')) currentTable = 'ps_manufacturer';
            else if (trimmed.includes('`ps_category`')) currentTable = 'ps_category';
            else if (trimmed.includes('`ps_category_lang`')) currentTable = 'ps_category_lang';
            else if (trimmed.includes('`ps_product`')) currentTable = 'ps_product';
            else if (trimmed.includes('`ps_product_lang`')) currentTable = 'ps_product_lang';
            else if (trimmed.includes('`ps_stock_available`')) currentTable = 'ps_stock_available';
            else if (trimmed.includes('`ps_image`')) currentTable = 'ps_image';
            else currentTable = '';
        }

        if (!currentTable || !trimmed.startsWith('(')) continue;

        const cleanLine = trimmed.replace(/;$/, '');
        const tuples = splitValues(cleanLine);

        for (const tuple of tuples) {
            const vals = parseTuple(tuple);
            processData(currentTable, vals);
        }
    }
    console.log('\n✅ Dosya okuma tamamlandı.');
}

function processData(table: string, vals: any[]) {
    try {
        if (table === 'ps_manufacturer') {
            const id = vals[0];
            const name = vals[1];
            const active = vals[4] === 1;
            brands.set(id, { id, name, active });
        }
        else if (table === 'ps_category') {
            const id = vals[0];
            const parentId = vals[1];
            const active = vals[6] === 1;
            categories.set(id, { id, parentId, active });
        }
        else if (table === 'ps_category_lang') {
            const id = vals[0];
            const langId = vals[2];
            const name = vals[3];
            const desc = vals[4];
            if (!categoryLangs.has(id) || langId === 1) {
                categoryLangs.set(id, { name, desc });
            }
        }
        else if (table === 'ps_product') {
            const id = vals[0];
            const manuId = vals[2];
            const catId = vals[3];
            const price = vals[13];

            products.set(id, {
                id,
                brandId: manuId,
                categoryId: catId,
                price: typeof price === 'number' ? price : 0,
                reference: '',
                active: true,
                quantity: 0,
                imageIds: []
            });
        }
        else if (table === 'ps_product_lang') {
            const id = vals[0];
            const langId = vals[2];
            const desc = vals[3];
            const name = vals[9];
            if (!productLangs.has(id) || langId === 1) {
                productLangs.set(id, { name, desc });
            }
        }
        else if (table === 'ps_stock_available') {
            const prodId = vals[1];
            const attrId = vals[2];
            const qty = vals[5];

            if (attrId === 0) {
                const p = products.get(prodId);
                if (p) {
                    p.quantity = Number(qty);
                }
            }
        }
        else if (table === 'ps_image') {
            // id_image, id_product, position, cover
            const imgId = vals[0];
            const prodId = vals[1];

            if (!productImages.has(prodId)) {
                productImages.set(prodId, []);
            }
            productImages.get(prodId)?.push(imgId);
        }
    } catch (e) {
        // ignore
    }
}

function mergeData() {
    console.log('🔄 Veriler birleştiriliyor...');
    // Categories
    for (const [id, cat] of categories) {
        const lang = categoryLangs.get(id);
        if (lang) {
            cat.name = lang.name;
            cat.description = lang.desc;
        } else {
            cat.name = `Category ${id}`;
        }
    }
    // Products
    for (const [id, prod] of products) {
        const lang = productLangs.get(id);
        if (lang) {
            prod.name = lang.name;
            prod.description = lang.desc;
        } else {
            prod.name = `Product ${id}`;
        }

        // Merge Images
        const imgs = productImages.get(id);
        if (imgs) {
            prod.imageIds = imgs;
        }
    }
}

async function writeToDb() {
    console.log('💾 Veritabanına yazılıyor...');

    const brandIdMap = new Map<number, string>();
    console.log(`Markalar: ${brands.size}`);
    for (const b of brands.values()) {
        const created = await prisma.brand.create({
            data: {
                name: b.name || `Brand ${b.id}`,
                slug: slugify(b.name || `brand-${b.id}`),
                isActive: b.active
            }
        });
        brandIdMap.set(b.id, created.id);
    }

    const catIdMap = new Map<number, string>();
    console.log(`Kategoriler: ${categories.size}`);
    for (const c of categories.values()) {
        const created = await prisma.category.create({
            data: {
                name: c.name!,
                slug: slugify(c.name || `cat-${c.id}`) + '-' + c.id,
                isActive: c.active,
            }
        });
        catIdMap.set(c.id, created.id);
    }

    for (const c of categories.values()) {
        if (c.parentId && c.parentId > 0 && catIdMap.has(c.parentId)) {
            await prisma.category.update({
                where: { id: catIdMap.get(c.id) },
                data: { parentId: catIdMap.get(c.parentId) }
            });
        }
    }

    console.log(`Ürünler: ${products.size}`);
    for (const p of products.values()) {
        const newBrandId = brandIdMap.get(p.brandId);
        const newCatId = catIdMap.get(p.categoryId);

        // Convert image IDs to URLs
        const images = p.imageIds.map(id => {
            const chars = id.toString().split('');
            return `/img/p/${chars.join('/')}/${id}.jpg`;
        });

        await prisma.product.create({
            data: {
                name: p.name!,
                slug: slugify(p.name || `prod-${p.id}`) + '-' + p.id,
                description: p.description || '',
                listPrice: p.price,
                stock: p.quantity,
                isActive: p.active,
                brandId: newBrandId,
                categoryId: newCatId,
                images: images
            }
        });
    }
    console.log('✅ İşlem Tamamlandı.');
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

function slugify(text: string) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
