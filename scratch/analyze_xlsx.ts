
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = 'emreserin_ÜrünGüncelle_11052026_122729.xlsx';

if (fs.existsSync(filePath)) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log('--- Headers ---');
    console.log(data[0]);
    console.log('--- Row 1 ---');
    console.log(data[1]);
    console.log('--- Row 2 ---');
    console.log(data[2]);
    console.log('--- Total Rows ---');
    console.log(data.length);
} else {
    console.log('File not found');
}
