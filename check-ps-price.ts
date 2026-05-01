
import fs from 'fs';
import readline from 'readline';

const DUMP_FILE = 'u1184310_lada.sql';
const TARGET_ID = 109;

async function checkPrice() {
    const fileStream = fs.createReadStream(DUMP_FILE, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let currentTable = '';
    console.log(`ID ${TARGET_ID} için ps_product tablosunda fiyat aranıyor...`);

    let foundProduct = false;
    let foundShop = false;

    for await (const line of rl) {
        const trimmed = line.trim();
        if (trimmed.startsWith('INSERT INTO')) {
            if (trimmed.includes('`ps_product`')) currentTable = 'ps_product';
            else if (trimmed.includes('`ps_product_shop`')) currentTable = 'ps_product_shop';
            else currentTable = '';
        }

        if ((currentTable === 'ps_product' || currentTable === 'ps_product_shop') && trimmed.startsWith('(')) {
            const cleanLine = trimmed.replace(/;$/, '');
            const tuples = splitValues(cleanLine);

            for (const tuple of tuples) {
                const vals = parseTuple(tuple);
                const id = vals[0];

                if (id === TARGET_ID) {
                    if (currentTable === 'ps_product') {
                        const price = vals[13];
                        console.log(`✅ [ps_product] Ürün Bulundu! ID: ${id}`);
                        console.log(`💰 Fiyat (Index 13):`, price);
                        foundProduct = true;
                    }
                    if (currentTable === 'ps_product_shop') {
                        // Assuming price is index 8 (standard PS 1.6)
                        const price = vals[8];
                        console.log(`✅ [ps_product_shop] Ürün Bulundu! ID: ${id}`);
                        console.log(`💰 Fiyat (Index 8):`, price);
                        console.log(`📄 Tüm Veri:`, vals);
                        foundShop = true;
                    }

                    if (foundProduct && foundShop) process.exit(0);
                }
            }
        }
    }
    console.log('❌ Ürün bulunamadı.');
}

// Utils (Copied from migrate-dump.ts)
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

checkPrice().catch(console.error);
