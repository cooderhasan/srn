import fs from 'fs';
import readline from 'readline';

const DUMP_FILE = 'u1184310_lada.sql';

async function parseDumpFile() {
    const fileStream = fs.createReadStream(DUMP_FILE, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let currentTable = '';
    let matchCount = 0;

    console.log("Searching for products in Category 41 (ps_category_product)...");

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
                // Schema: id_category, id_product, position
                const catId = Number(vals[0]);
                const prodId = Number(vals[1]);

                if (catId === 41) {
                    console.log(`MATCH: Product ID ${prodId} is linked to Category 41`);
                    matchCount++;
                    if (matchCount >= 5) process.exit(0);
                }
            }
        }
    }

    if (matchCount === 0) {
        console.log("No matches found for Category 41 in ps_category_product.");
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

parseDumpFile();
