
import fs from 'fs';
import readline from 'readline';

const DUMP_FILE = 'u1184310_lada.sql';
const OUTPUT_FILE = 'global_relations.json';

async function parseDumpFile() {
    const fileStream = fs.createReadStream(DUMP_FILE, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let currentTable = '';

    // Legacy ID -> Name maps
    const categoryNames = new Map<number, string>();
    const productNames = new Map<number, string>();

    // Relations: Category ID -> Set of Product IDs
    const categoryRelations = new Map<number, Set<number>>();

    console.log("Scanning dump for ALL category-product relations...");
    let lineCount = 0;

    for await (const line of rl) {
        lineCount++;
        if (lineCount % 100000 === 0) process.stdout.write('.');

        const trimmed = line.trim();
        if (trimmed.startsWith('INSERT INTO')) {
            if (trimmed.includes('`ps_category_lang`')) currentTable = 'ps_category_lang';
            else if (trimmed.includes('`ps_product`')) currentTable = 'ps_product';
            else if (trimmed.includes('`ps_product_lang`')) currentTable = 'ps_product_lang';
            else if (trimmed.includes('`ps_category_product`')) currentTable = 'ps_category_product';
            else currentTable = '';
        }

        if (!currentTable) continue;

        if (trimmed.startsWith('(')) {
            const cleanLine = trimmed.replace(/;$/, '');
            const tuples = splitValues(cleanLine);

            for (const tuple of tuples) {
                const vals = parseTuple(tuple);

                if (currentTable === 'ps_category_lang') {
                    // id_category (0), id_shop (1), id_lang (2), name (3)
                    const id = Number(vals[0]);
                    const langId = Number(vals[2]);
                    const name = String(vals[3]);
                    // Prefer lang 1 (TR) but take any if not set
                    if (langId === 1 || !categoryNames.has(id)) {
                        categoryNames.set(id, name);
                    }
                }
                else if (currentTable === 'ps_product_lang') {
                    // id_product (0), ..., id_lang (2), ..., name (9)
                    const id = Number(vals[0]);
                    const langId = Number(vals[2]);
                    const name = String(vals[9]);
                    if (langId === 1 || !productNames.has(id)) {
                        productNames.set(id, name);
                    }
                }
                else if (currentTable === 'ps_category_product') {
                    // id_category (0), id_product (1)
                    const catId = Number(vals[0]);
                    const prodId = Number(vals[1]);

                    if (!categoryRelations.has(catId)) categoryRelations.set(catId, new Set());
                    categoryRelations.get(catId)!.add(prodId);
                }
                else if (currentTable === 'ps_product') {
                    // id_product (0), ..., id_category_default (3)
                    const prodId = Number(vals[0]);
                    const catId = Number(vals[3]);

                    if (!isNaN(catId) && catId > 0) {
                        if (!categoryRelations.has(catId)) categoryRelations.set(catId, new Set());
                        categoryRelations.get(catId)!.add(prodId);
                    }
                }
            }
        }
    }
    console.log("\nParsing complete.");

    // Transform to Output Format: { CategoryName: [ProductNames...] }
    const output: Record<string, string[]> = {};

    for (const [catId, prodIds] of categoryRelations) {
        const catName = categoryNames.get(catId);
        if (!catName || catName === 'Root' || catName === 'Home') continue; // Skip root/system cats if needed

        const prodList: string[] = [];
        for (const prodId of prodIds) {
            const prodName = productNames.get(prodId);
            if (prodName) {
                prodList.push(prodName);
            }
        }

        if (prodList.length > 0) {
            // Append if same name exists (legacy DB might have had dupe names, but keys must be unique in JSON)
            // We use name as key. If duplicate names, we merge.
            // But better to strictly use Name.
            // If multiple IDs have same name (unlikely for cats?), merging is fine.
            if (!output[catName]) output[catName] = [];
            output[catName].push(...prodList);
        }
    }

    // Dedupe product names in each category
    let totalRelations = 0;
    for (const key in output) {
        output[key] = Array.from(new Set(output[key]));
        totalRelations += output[key].length;
    }

    console.log(`Extracted ${Object.keys(output).length} categories.`);
    console.log(`Total Product-Category links: ${totalRelations}`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`Written to ${OUTPUT_FILE}`);
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

parseDumpFile();
