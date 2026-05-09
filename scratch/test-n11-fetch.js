
const apiKey = "d3482d56-dcf1-4887-b9bf-32e8d2fb4dc9";
const apiSecret = "jpG3NrFKVRTpGGPu";

async function testFetch(id) {
    // console.log(`Request ${id} started...`);
    try {
        const response = await fetch("https://api.n11.com/cdn/categories", {
            headers: {
                "appKey": apiKey,
                "appSecret": apiSecret,
                "Content-Type": "application/json"
            }
        });
        return { id, status: response.status };
    } catch (err) {
        return { id, error: err.message };
    }
}

async function runMany() {
    console.log("Starting 20 parallel requests...");
    const promises = [];
    for (let i = 0; i < 20; i++) {
        promises.push(testFetch(i));
    }
    const results = await Promise.all(promises);
    results.forEach(r => {
        if (r.error) console.log(`Result ${r.id}: FAILED - ${r.error}`);
        else console.log(`Result ${r.id}: SUCCESS - ${r.status}`);
    });
}

runMany();
