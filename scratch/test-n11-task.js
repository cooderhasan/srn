
const apiKey = "d3482d56-dcf1-4887-b9bf-32e8d2fb4dc9";
const apiSecret = "jpG3NrFKVRTpGGPu";
const taskId = "2749398988";

async function testFetch() {
    console.log(`Testing task fetch for ${taskId} WITH ORIGINAL URL...`);
    try {
        const response = await fetch(`https://api.n11.com/ms/product/v1/tasks/${taskId}`, {
            headers: {
                "appKey": apiKey,
                "appSecret": apiSecret,
                "Content-Type": "application/json"
            }
        });
        console.log("Status:", response.status);
    } catch (err) {
        console.log("Caught expected error:", err.message);
        if (err.message === 'fetch failed') {
             console.log("SIMULATED FIX: N11 servis bağlantı hatası (Servis şu an kararsız veya ulaşılamıyor).");
        }
    }
}

testFetch();
