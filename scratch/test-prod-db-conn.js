const { Client } = require('pg');

async function main() {
    const connectionString = "postgres://postgres:YIVjfixFdgdSPMDEm9pf7UMFfO354AggIMrJAszjyyWGKjdMfBYuj8Lzh3Rb490S@vo4gook4kcwgocwo4wgk0cgw:5432/postgres";
    const client = new Client({ connectionString });
    try {
        console.log("Connecting to production database...");
        await client.connect();
        console.log("Connected successfully!");
        
        const res = await client.query('SELECT * FROM "HepsiburadaConfig" LIMIT 1;');
        console.log("Hepsiburada Config from Prod DB:", res.rows);
    } catch (e) {
        console.error("Connection failed:", e.message);
    } finally {
        await client.end();
    }
}

main();
