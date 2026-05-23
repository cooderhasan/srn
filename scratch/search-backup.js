const fs = require('fs');
const path = require('path');

const backupPath = path.join('d:', 'SRN', 'scripts', 'backup_scripts', 'full_backup.json');

if (!fs.existsSync(backupPath)) {
    console.log("Backup file does not exist at:", backupPath);
    process.exit(1);
}

try {
    const raw = fs.readFileSync(backupPath, 'utf8');
    const data = JSON.parse(raw);
    console.log("Backup root keys:", Object.keys(data));
    
    // Search for config keys
    for (const key of Object.keys(data)) {
        if (key.toLowerCase().includes("config") || key.toLowerCase().includes("hepsiburada")) {
            console.log(`Key found: ${key}, type: ${typeof data[key]}, length: ${data[key]?.length}`);
            if (key.toLowerCase().includes("hepsiburada") || key.toLowerCase().includes("config")) {
                console.log(JSON.stringify(data[key], null, 2).substring(0, 1000));
            }
        }
    }
} catch (e) {
    console.error("Error reading/parsing backup:", e);
}
