
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = 'Ürünleriniz_11.05.2026-12.42.xlsx';

if (fs.existsSync(filePath)) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log('--- Headers (Stringified) ---');
    console.log(JSON.stringify(data[0]));
    console.log('--- Row 1 (Stringified) ---');
    console.log(JSON.stringify(data[1]));
} else {
    console.log('File not found');
}
