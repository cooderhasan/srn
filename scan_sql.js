const fs = require('fs');
const readline = require('readline');

const filePath = process.argv[2];
const searchPattern = process.argv[3]; // string or regex
const contextLines = 20;

if (!filePath || !searchPattern) {
  console.log('Usage: node scan_sql.js <file> <pattern>');
  process.exit(1);
}

const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

let found = false;
let linesToPrint = 0;

console.log(`Searching for "${searchPattern}" in ${filePath}...`);

rl.on('line', (line) => {
  if (line.includes(searchPattern)) {
    found = true;
    linesToPrint = contextLines;
    console.log('MATCH FOUND:');
    console.log(line);
  } else if (linesToPrint > 0) {
    console.log(line);
    linesToPrint--;
    if (linesToPrint === 0) {
        // Hedefi bulduk, artık çıkabiliriz (İsteğe bağlı, birden fazla match isteniyorsa çıkma)
        process.exit(0); 
    }
  }
});

rl.on('close', () => {
  if (!found) console.log('Pattern not found.');
});
