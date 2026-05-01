import fs from 'fs';
import readline from 'readline';

const DUMP_FILE = 'u1184310_lada.sql';

async function parseDumpFile() {
    const fileStream = fs.createReadStream(DUMP_FILE, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let currentTable = '';
    let productCount = 0;

    console.log("SQL Dump taranıyor ve ürünler sayılıyor...");

    for await (const line of rl) {
        const trimmed = line.trim();
        if (trimmed.startsWith('INSERT INTO')) {
            if (trimmed.includes('`ps_product`')) currentTable = 'ps_product';
            else currentTable = '';
        }

        if (currentTable === 'ps_product' && trimmed.startsWith('(')) {
            const cleanLine = trimmed.replace(/;$/, '');
            // Basitçe parantezleri sayalım veya splitValues kullanalım
            // splitValues daha güvenilir çünkü bir INSERT birden fazla ürün içerebilir
            const tuples = splitValues(cleanLine);
            productCount += tuples.length;
        }
    }

    console.log(`✅ SQL Dump dosyasında toplam ${productCount} adet ürün bulundu.`);
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

parseDumpFile();
